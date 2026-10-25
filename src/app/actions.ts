"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkDevice, recordSignIn, requestDeviceApproval } from "@/lib/auth/devices";
import { getSessionUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/types";
import { deliverEmailsSoon } from "@/lib/email/outbox";
import { sendEmail } from "@/lib/email/send";
import { contactReceiptEmail, contactStaffEmail, waitlistJoinedEmail } from "@/lib/email/templates";
import {
  changePasswordSchema,
  contactSchema,
  contactTopics,
  loginSchema,
  waitlistSchema,
  type ChangePasswordValues,
  type ContactValues,
  type LoginValues,
  type WaitlistValues,
} from "@/lib/schemas";
import { site } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string; redirectTo?: string };

const mismatch: ActionResult = {
  ok: false,
  message: `That user ID and password don’t match. Check them and try again, or call ${site.phone} to reset your login.`,
};

/** Customers sign in with their login ID; Supabase Auth checks the password against their email. */
export async function signIn(values: LoginValues): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Check your user ID and password, then try again." };

  // Look up the email behind the login ID. Needs the secret key: nobody is signed in yet.
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, status, role, first_name, last_name")
    .eq("user_id", parsed.data.userId.trim().toLowerCase())
    .maybeSingle<{ id: string; email: string; status: string; role: string; first_name: string; last_name: string }>();

  if (!profile) return mismatch;
  if (profile.status !== "active") {
    return { ok: false, message: `This login is locked. Call ${site.phone} and we’ll help you get back in.` };
  }

  // Check the password with a client that keeps no cookies, so no session
  // reaches this browser until we know the device is allowed in.
  const verifier = createClient(supabaseUrl(), supabasePublishableKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error } = await verifier.auth.signInWithPassword({ email: profile.email, password: parsed.data.password });
  if (error || !auth.session) {
    if (error?.status === 429) return { ok: false, message: "Too many attempts. Wait a few minutes, then try again." };
    return mismatch;
  }

  // Customers on a new device with a new IP address wait for staff to approve it.
  if (profile.role === "customer") {
    let verdict: Awaited<ReturnType<typeof checkDevice>>;
    try {
      verdict = await checkDevice(profile.id);
    } catch (e) {
      console.error(e);
      await verifier.auth.signOut({ scope: "local" });
      return { ok: false, message: `We couldn’t check your device just now. Try again, or call ${site.phone}.` };
    }
    if (verdict === "needs_approval") {
      await verifier.auth.signOut({ scope: "local" }); // ends the session we just made
      try {
        await requestDeviceApproval(profile);
      } catch (e) {
        console.error(e);
        return { ok: false, message: `We couldn’t sign you in just now. Try again, or call ${site.phone}.` };
      }
      return { ok: true, message: "Waiting for approval.", redirectTo: "/authorize" };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error: sessionError } = await supabase.auth.setSession({ access_token: auth.session.access_token, refresh_token: auth.session.refresh_token });
  if (sessionError) return { ok: false, message: "We couldn’t sign you in just now. Try again in a moment." };

  const user = await getSessionUser();
  if (!user) return mismatch;
  await recordSignIn(user.id);
  return { ok: true, message: "Signed in.", redirectTo: homeFor(user) };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login?signedOut=1");
}

/** Sets a new password. Required on first sign-in, when the emailed password is still in use. */
export async function changePassword(values: ChangePasswordValues): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the password and try again." };

  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Your session has ended. Log in again to change your password." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const same = /different from the old|same_password/i.test(error.message + (error.code ?? ""));
    return {
      ok: false,
      message: same ? "Choose a password you haven’t used for this login before." : "That password can’t be used. Try a longer one with letters and numbers.",
    };
  }

  const admin = createSupabaseAdminClient();
  if (user.mustChangePassword) {
    // Customers can't edit their own profile row, so the flag is cleared with the secret key.
    await admin.from("profiles").update({ must_change_password: false }).eq("id", user.id);
  }
  await admin.from("notifications").insert({
    profile_id: user.id,
    kind: "security",
    title: "Password changed",
    body: "The password for your online banking was just changed. If you didn’t do this, call us straight away.",
  });
  deliverEmailsSoon();
  return { ok: true, message: "Password changed.", redirectTo: homeFor({ ...user, mustChangePassword: false }) };
}

/** Loan waitlist from the public website. */
export async function joinLoanWaitlist(values: WaitlistValues): Promise<ActionResult> {
  const parsed = waitlistSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Check the highlighted fields and try again." };
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("loan_waitlist").insert({ product: parsed.data.product, email: parsed.data.email.toLowerCase() });
  // A repeat sign-up for the same loan is fine: they're already on the list.
  if (error && error.code !== "23505") return { ok: false, message: "We couldn’t add you just now. Try again in a minute." };
  // Only a first sign-up gets the confirmation, so the form can't be used to email someone over and over.
  if (!error) after(() => sendEmail({ to: parsed.data.email, ...waitlistJoinedEmail({ product: parsed.data.product }) }));
  return { ok: true, message: `You’re on the list. We’ll email ${parsed.data.email} as soon as loans open.` };
}

/** Contact form from the public website. Staff read these in the admin area. */
export async function sendContactMessage(values: ContactValues): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Check the highlighted fields and try again." };
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    topic: parsed.data.topic,
    message: parsed.data.message,
  });
  if (error) return { ok: false, message: `We couldn’t send that just now. Try again, or call ${site.phone}.` };

  const v = parsed.data;
  const topicLabel = contactTopics.find((t) => t.value === v.topic)?.label ?? "Something else";
  after(async () => {
    await sendEmail({ to: process.env.STAFF_EMAIL || site.email, replyTo: v.email, ...contactStaffEmail({ ...v, topicLabel }) });
    // At most one receipt an hour per address, so the form can't be used to flood someone's inbox.
    const { count } = await admin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("email", v.email)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) <= 1) await sendEmail({ to: v.email, ...contactReceiptEmail({ topicLabel }) });
  });
  return { ok: true, message: "Message sent. We reply within one business day." };
}
