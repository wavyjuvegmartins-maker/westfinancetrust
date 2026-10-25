"use server";

import { cookies } from "next/headers";
import { currentDeviceRequest, pendingCookie, recordSignIn } from "@/lib/auth/devices";
import { getSessionUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ApprovalState =
  | { status: "pending" }
  | { status: "denied"; reason: string | null }
  | { status: "expired" }
  | { status: "signed_in"; redirectTo: string }
  | { status: "missing" };

/** How long after approval the waiting screen may still sign in by itself. */
const pickUpMinutes = 15;

/**
 * Checked every few seconds by the waiting screen. Once staff approve the
 * device it signs this browser in, once, without asking for the password again.
 */
export async function pollDeviceApproval(): Promise<ApprovalState> {
  const request = await currentDeviceRequest();
  if (!request || request.status === "cancelled") return { status: "missing" };
  if (request.status === "denied") return { status: "denied", reason: request.deny_reason };
  if (request.status === "pending") return new Date(request.expires_at) < new Date() ? { status: "expired" } : { status: "pending" };
  if (request.status === "used") return { status: "expired" };

  // Approved. Too long ago and they log in again (the device is trusted now, so it goes straight through).
  if (!request.decided_at || Date.now() - new Date(request.decided_at).getTime() > pickUpMinutes * 60_000) return { status: "expired" };

  const admin = createSupabaseAdminClient();
  // Claim it, so two tabs can't both use one approval.
  const { data: claimed } = await admin
    .from("device_login_requests")
    .update({ status: "used" })
    .eq("id", request.id)
    .eq("status", "approved")
    .select("id");
  if (!claimed?.length) return { status: "expired" };

  const { data: profile } = await admin.from("profiles").select("email, status").eq("id", request.profile_id).maybeSingle<{ email: string; status: string }>();
  if (!profile || profile.status !== "active") return { status: "denied", reason: null };

  // A one-time sign-in link made on the server and used straight away: nothing is emailed.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: profile.email });
  if (linkError || !link.properties?.hashed_token) {
    console.error("Couldn’t make the sign-in link", linkError);
    return { status: "expired" };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  if (error) {
    console.error("Couldn’t complete the approved sign-in", error);
    return { status: "expired" };
  }

  (await cookies()).delete(pendingCookie);
  const user = await getSessionUser();
  if (!user) return { status: "expired" };
  await recordSignIn(user.id);
  return { status: "signed_in", redirectTo: homeFor(user) };
}

/** "Cancel": stops waiting and withdraws the request from the staff queue. */
export async function cancelDeviceSignIn() {
  const request = await currentDeviceRequest();
  if (request?.status === "pending") {
    await createSupabaseAdminClient().from("device_login_requests").update({ status: "cancelled" }).eq("id", request.id).eq("status", "pending");
  }
  (await cookies()).delete(pendingCookie);
}
