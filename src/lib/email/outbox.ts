import "server-only";
import { after } from "next/server";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { noticeEmail, type NoticeTopic } from "@/lib/email/templates";
import { deliverPendingPushes } from "@/lib/push/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Notifications double as an email outbox. Whatever creates one (a server
// action, a database trigger, the nightly jobs) leaves it `pending`; this sends
// it once and records the result on the row.

const maxAttempts = 3;
const staleAfterHours = 48; // an alert this old isn't worth sending any more
const batchSize = 50;

type Pending = {
  id: string;
  profile_id: string;
  kind: string;
  topic: NoticeTopic | null;
  title: string;
  body: string;
  email_attempts: number;
  created_at: string;
};

type Settings = { profile_id: string; activity_emails: boolean; low_balance_alerts: boolean; login_alerts: boolean };

const topicOf = (n: Pending): NoticeTopic => n.topic ?? (n.kind === "security" ? "security" : "activity");

function wanted(topic: NoticeTopic, s: Settings | undefined) {
  if (topic === "security" || topic === "message") return true; // can't be turned off
  if (topic === "activity") return s?.activity_emails ?? true;
  if (topic === "low_balance") return s?.low_balance_alerts ?? true;
  return s?.login_alerts ?? true;
}

/** Sends every pending notification email. Safe to run at the same time from several places. */
export async function deliverPendingEmails(): Promise<{ sent: number; skipped: number; failed: number }> {
  const admin = createSupabaseAdminClient();
  const tally = { sent: 0, skipped: 0, failed: 0 };
  const now = Date.now();

  // A run that died mid-send leaves rows `sending`; hand them back after 15 minutes.
  // (Resend's idempotency key stops a real double send.)
  await admin
    .from("notifications")
    .update({ email_status: "pending" })
    .eq("email_status", "sending")
    .lt("email_at", new Date(now - 15 * 60_000).toISOString());

  const { data: rows } = await admin
    .from("notifications")
    .select("id, profile_id, kind, topic, title, body, email_attempts, created_at")
    .eq("email_status", "pending")
    .order("created_at")
    .limit(batchSize)
    .returns<Pending[]>();
  if (!rows?.length) return tally;

  const ids = [...new Set(rows.map((r) => r.profile_id))];
  const [{ data: people }, { data: settings }] = await Promise.all([
    admin.from("profiles").select("id, email, first_name, status").in("id", ids).returns<{ id: string; email: string; first_name: string; status: string }[]>(),
    admin.from("user_settings").select("profile_id, activity_emails, low_balance_alerts, login_alerts").in("profile_id", ids).returns<Settings[]>(),
  ]);

  const finish = (id: string, email_status: string, email_attempts?: number) =>
    admin
      .from("notifications")
      .update({ email_status, email_at: new Date().toISOString(), ...(email_attempts !== undefined ? { email_attempts } : {}) })
      .eq("id", id);

  for (const n of rows) {
    // Claim the row, so a second run going at the same time leaves it alone.
    const { data: claimed } = await admin
      .from("notifications")
      .update({ email_status: "sending", email_at: new Date().toISOString() })
      .eq("id", n.id)
      .eq("email_status", "pending")
      .select("id");
    if (!claimed?.length) continue;

    const person = people?.find((p) => p.id === n.profile_id);
    const topic = topicOf(n);
    const stale = now - new Date(n.created_at).getTime() > staleAfterHours * 3600_000;
    if (!person || person.status !== "active" || stale || !wanted(topic, settings?.find((s) => s.profile_id === n.profile_id))) {
      await finish(n.id, "skipped");
      tally.skipped++;
      continue;
    }

    const result = await sendEmail({
      to: person.email,
      ...noticeEmail({ firstName: person.first_name, title: n.title, body: n.body, topic }),
      idempotencyKey: `notification-${n.id}`,
    });
    if (result.sent) {
      await finish(n.id, "sent");
      tally.sent++;
    } else if (!emailConfigured()) {
      // No email service yet: don't pile up a backlog to send the day one is added.
      await finish(n.id, "skipped");
      tally.skipped++;
    } else {
      const attempts = n.email_attempts + 1;
      await finish(n.id, attempts >= maxAttempts ? "failed" : "pending", attempts);
      tally.failed++;
    }
  }
  return tally;
}

/**
 * Sends pending notification emails and push notifications once the current
 * response has gone. Call after anything that notifies.
 */
export function deliverEmailsSoon() {
  after(async () => {
    const [emails, pushes] = await Promise.allSettled([deliverPendingEmails(), deliverPendingPushes()]);
    if (emails.status === "rejected") console.error("Notification emails failed", emails.reason);
    if (pushes.status === "rejected") console.error("Push notifications failed", pushes.reason);
  });
}
