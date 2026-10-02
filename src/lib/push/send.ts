import "server-only";
import webpush, { WebPushError } from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Push notifications to the installed app (and any browser that allowed them).
// Devices are stored in push_subscriptions; public/sw.js shows what arrives.

export type PushMessage = {
  title: string;
  body: string;
  /** Page to open when the notification is tapped. */
  url: string;
  /** Notifications with the same tag replace each other instead of stacking. */
  tag?: string;
};

type Device = { id: string; profile_id: string; endpoint: string; p256dh: string; auth: string };

const batchSize = 50;
// An alert older than this isn't worth buzzing someone's phone for.
const staleAfterHours = 12;

let configured: boolean | undefined;
export function pushConfigured() {
  if (configured === undefined) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    configured = !!publicKey && !!privateKey;
    if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@westfinacetrust.com", publicKey!, privateKey!);
  }
  return configured;
}

/** Sends one message to each device. Devices the push service says are gone are deleted. */
async function sendToDevices(devices: Device[], message: PushMessage) {
  if (!devices.length || !pushConfigured()) return 0;
  const admin = createSupabaseAdminClient();
  const payload = JSON.stringify(message);
  let sent = 0;
  await Promise.all(
    devices.map(async (d) => {
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: 60 * 60 * 12, urgency: "high" });
        sent++;
        await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", d.id);
      } catch (error) {
        // 404/410: the person turned notifications off or removed the app.
        if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
          await admin.from("push_subscriptions").delete().eq("id", d.id);
        } else {
          console.error("Push failed", error instanceof WebPushError ? error.statusCode : error);
        }
      }
    }),
  );
  return sent;
}

/** Pushes to every device of the given people. */
export async function pushToProfiles(profileIds: string[], message: PushMessage) {
  if (!profileIds.length || !pushConfigured()) return 0;
  const { data } = await createSupabaseAdminClient()
    .from("push_subscriptions")
    .select("id, profile_id, endpoint, p256dh, auth")
    .in("profile_id", profileIds)
    .returns<Device[]>();
  return sendToDevices(data ?? [], message);
}

/** Pushes to every active member of staff, e.g. when a customer sends a message. */
export async function pushToStaff(message: PushMessage) {
  if (!pushConfigured()) return 0;
  const { data: staff } = await createSupabaseAdminClient()
    .from("profiles")
    .select("id")
    .in("role", ["admin", "account_opener"])
    .eq("status", "active")
    .returns<{ id: string }[]>();
  return pushToProfiles((staff ?? []).map((s) => s.id), message);
}

type Pending = { id: string; profile_id: string; title: string; body: string; topic: string | null; created_at: string };

/**
 * Pushes every pending notification once, to all of that person's devices.
 * Runs next to the email outbox (src/lib/email/outbox.ts).
 */
export async function deliverPendingPushes(): Promise<{ sent: number; skipped: number }> {
  const tally = { sent: 0, skipped: 0 };
  const admin = createSupabaseAdminClient();

  const { data: rows } = await admin
    .from("notifications")
    .select("id, profile_id, title, body, topic, created_at")
    .eq("push_status", "pending")
    .order("created_at")
    .limit(batchSize)
    .returns<Pending[]>();
  if (!rows?.length) return tally;

  for (const n of rows) {
    // Claim the row so a second run going at the same time leaves it alone.
    const { data: claimed } = await admin.from("notifications").update({ push_status: "sending" }).eq("id", n.id).eq("push_status", "pending").select("id");
    if (!claimed?.length) continue;

    const stale = Date.now() - new Date(n.created_at).getTime() > staleAfterHours * 3600_000;
    const sent = stale
      ? 0
      : await pushToProfiles([n.profile_id], {
          title: n.title,
          body: n.body,
          url: n.topic === "message" ? "/dashboard/messages" : "/dashboard",
          tag: n.topic === "message" ? "messages" : undefined,
        });
    await admin.from("notifications").update({ push_status: sent ? "sent" : "skipped" }).eq("id", n.id);
    if (sent) tally.sent++;
    else tally.skipped++;
  }
  return tally;
}
