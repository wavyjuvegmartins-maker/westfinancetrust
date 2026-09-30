import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { deliverEmailsSoon } from "@/lib/email/outbox";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const cookieName = "wft_device";

/** "Chrome on Windows", from a user-agent string. Good enough for a sign-in alert. */
export function describeDevice(ua: string) {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "a browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iPhone or iPad"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "an unknown device";
  return `${browser} on ${os}`;
}

/**
 * Called after a successful sign-in. Remembers this browser, and if the person
 * has signed in elsewhere before but never here, tells them (when their
 * new sign-in alerts are on). Never fails the sign-in itself.
 */
export async function recordSignIn(profileId: string) {
  try {
    const jar = await cookies();
    const h = await headers();
    let deviceId = jar.get(cookieName)?.value;
    if (!deviceId || !/^[0-9a-f]{64}$/.test(deviceId)) deviceId = randomBytes(32).toString("hex");
    // Refreshed on every sign-in; browsers cap cookies at 400 days.
    jar.set(cookieName, deviceId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 400 * 86400 });

    const hash = createHash("sha256").update(deviceId).digest("hex");
    const ua = (h.get("user-agent") ?? "").slice(0, 300);
    const admin = createSupabaseAdminClient();

    const { data: known } = await admin.from("known_devices").select("device_hash").eq("profile_id", profileId);
    if (known?.some((d) => d.device_hash === hash)) {
      await admin.from("known_devices").update({ last_seen: new Date().toISOString(), user_agent: ua }).eq("profile_id", profileId).eq("device_hash", hash);
      return;
    }
    await admin.from("known_devices").insert({ profile_id: profileId, device_hash: hash, user_agent: ua });
    if (!known?.length) return; // their first sign-in anywhere: nothing to compare with

    const { data: settings } = await admin.from("user_settings").select("login_alerts").eq("profile_id", profileId).maybeSingle<{ login_alerts: boolean }>();
    if (settings && !settings.login_alerts) return;

    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
    await admin.from("notifications").insert({
      profile_id: profileId,
      kind: "security",
      topic: "login",
      title: "New sign-in to online banking",
      body: `Someone signed in to your account from ${describeDevice(ua)}${ip ? ` (IP address ${ip})` : ""}. If it was you, there’s nothing to do.`,
    });
    deliverEmailsSoon();
  } catch (error) {
    console.error("Couldn’t record the sign-in device", error);
  }
}
