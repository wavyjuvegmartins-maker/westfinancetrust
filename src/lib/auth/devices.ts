import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { deliverEmailsSoon } from "@/lib/email/outbox";
import { pushToStaff } from "@/lib/push/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const cookieName = "wft_device";
/** The waiting screen's own secret, tying it to one approval request. */
export const pendingCookie = "wft_pending";
const pendingHours = 12;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const secure = process.env.NODE_ENV === "production";

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

/** This browser's device ID (made and stored if it has none), its user agent and IP address. */
async function thisDevice() {
  const jar = await cookies();
  const h = await headers();
  let deviceId = jar.get(cookieName)?.value;
  if (!deviceId || !/^[0-9a-f]{64}$/.test(deviceId)) deviceId = randomBytes(32).toString("hex");
  // Refreshed on every sign-in; browsers cap cookies at 400 days.
  jar.set(cookieName, deviceId, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 400 * 86400 });
  return {
    hash: sha256(deviceId),
    ua: (h.get("user-agent") ?? "").slice(0, 300),
    ip: (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "").slice(0, 64) || null,
  };
}

type KnownDevice = { device_hash: string; first_ip: string | null; last_ip: string | null };

/**
 * Whether this browser may sign in to a customer's account straight away.
 * It may if it has signed in to this account before, if it's using an IP
 * address one of their devices has used, or if it's their first sign-in
 * anywhere (staff opened the account with them). Otherwise staff must approve it.
 */
export async function checkDevice(profileId: string): Promise<"trusted" | "needs_approval"> {
  const device = await thisDevice();
  const { data, error } = await createSupabaseAdminClient()
    .from("known_devices")
    .select("device_hash, first_ip, last_ip")
    .eq("profile_id", profileId)
    .returns<KnownDevice[]>();
  if (error) {
    // Before the device-approval migration is run the columns don't exist: keep letting people in.
    if (error.code === "42703" || error.code === "42P01") return "trusted";
    throw new Error(`Couldn’t check the device: ${error.message}`);
  }
  if (!data.length) return "trusted";
  if (data.some((d) => d.device_hash === device.hash)) return "trusted";
  if (device.ip && data.some((d) => d.first_ip === device.ip || d.last_ip === device.ip)) return "trusted";
  return "needs_approval";
}

/**
 * Called after a successful sign-in. Remembers this browser and its IP address,
 * and if the person has signed in elsewhere before but never here, tells them
 * (when their new sign-in alerts are on). Never fails the sign-in itself.
 */
export async function recordSignIn(profileId: string) {
  try {
    const { hash, ua, ip } = await thisDevice();
    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data: known } = await admin.from("known_devices").select("device_hash").eq("profile_id", profileId);
    if (known?.some((d) => d.device_hash === hash)) {
      await admin.from("known_devices").update({ last_seen: now, user_agent: ua, last_ip: ip }).eq("profile_id", profileId).eq("device_hash", hash);
      return;
    }
    await admin.from("known_devices").insert({ profile_id: profileId, device_hash: hash, user_agent: ua, first_ip: ip, last_ip: ip, approved_at: now });
    if (!known?.length) return; // their first sign-in anywhere: nothing to compare with

    const { data: settings } = await admin.from("user_settings").select("login_alerts").eq("profile_id", profileId).maybeSingle<{ login_alerts: boolean }>();
    if (settings && !settings.login_alerts) return;

    // The IP address is kept for staff only.
    await admin.from("notifications").insert({
      profile_id: profileId,
      kind: "security",
      topic: "login",
      title: "New sign-in to online banking",
      body: `Someone signed in to your account from ${describeDevice(ua)}. If it was you, there’s nothing to do.`,
    });
    deliverEmailsSoon();
  } catch (error) {
    console.error("Couldn’t record the sign-in device", error);
  }
}

/**
 * Holds a sign-in from an unrecognised device for staff to approve. The browser
 * gets a secret cookie that lets the waiting screen pick up the answer.
 */
export async function requestDeviceApproval(profile: { id: string; first_name: string; last_name: string }) {
  const { hash, ua, ip } = await thisDevice();
  const admin = createSupabaseAdminClient();

  // One open request per browser: a fresh attempt replaces the old one.
  await admin
    .from("device_login_requests")
    .update({ status: "cancelled" })
    .eq("profile_id", profile.id)
    .eq("device_hash", hash)
    .eq("status", "pending");

  const token = randomBytes(32).toString("hex");
  const { error } = await admin.from("device_login_requests").insert({
    profile_id: profile.id,
    device_hash: hash,
    token_hash: sha256(token),
    ip,
    user_agent: ua,
    expires_at: new Date(Date.now() + pendingHours * 3600_000).toISOString(),
  });
  if (error) throw new Error(`Couldn’t hold the sign-in: ${error.message}`);
  (await cookies()).set(pendingCookie, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: pendingHours * 3600 });

  await admin.from("notifications").insert({
    profile_id: profile.id,
    kind: "security",
    title: "Sign-in waiting for approval",
    body: `Someone entered your password on ${describeDevice(ua)}, a device we don’t recognise. We’ve paused it until our team confirms it’s you. If it wasn’t you, call us straight away and change your password.`,
  });
  deliverEmailsSoon();
  after(async () => {
    try {
      await pushToStaff({
        title: "Device waiting for approval",
        body: `${profile.first_name} ${profile.last_name} is signing in from a new device.`,
        url: "/admin/devices",
        tag: `device-${profile.id}`,
      });
    } catch (e) {
      console.error("Staff push failed", e);
    }
  });
}

export type DeviceRequest = {
  id: string;
  profile_id: string;
  status: "pending" | "approved" | "denied" | "used" | "cancelled";
  deny_reason: string | null;
  decided_at: string | null;
  expires_at: string;
  user_agent: string | null;
};

/** The approval request this browser is waiting on, if any. */
export async function currentDeviceRequest() {
  const token = (await cookies()).get(pendingCookie)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const { data } = await createSupabaseAdminClient()
    .from("device_login_requests")
    .select("id, profile_id, status, deny_reason, decided_at, expires_at, user_agent")
    .eq("token_hash", sha256(token))
    .maybeSingle<DeviceRequest>();
  return data;
}
