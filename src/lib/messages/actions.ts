"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { deliverEmailsSoon } from "@/lib/email/outbox";
import { messageColumns, toChatMessage, type ChatMessage } from "@/lib/messages/queries";
import { pushToStaff } from "@/lib/push/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { site } from "@/lib/site";

export type SendResult = { ok: true; message: ChatMessage } | { ok: false; error: string };

const bodySchema = z.string().trim().min(1, "Write a message first.").max(2000, "Keep messages under 2,000 characters.");

// Enough for a real conversation, too few to flood the staff inbox.
const customerLimit = { count: 30, minutes: 60 };

/**
 * Sends a message in a conversation. Customers can only write in their own; staff
 * can write in any customer's. The server decides who is sending, never the browser.
 */
export async function sendMessage(input: { body: string; customerId?: string }): Promise<SendResult> {
  const user = await getSessionUser();
  if (!user || user.mustChangePassword) return { ok: false, error: "Your session has ended. Log in again to send messages." };

  const parsed = bodySchema.safeParse(input.body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  const fromStaff = user.role !== "customer";
  let customerId = user.id;

  if (fromStaff) {
    if (!input.customerId) return { ok: false, error: "Choose a customer to message." };
    const { data: customer } = await admin.from("profiles").select("id").eq("id", input.customerId).eq("role", "customer").maybeSingle();
    if (!customer) return { ok: false, error: "That customer doesn’t exist." };
    customerId = input.customerId;
  } else {
    const since = new Date(Date.now() - customerLimit.minutes * 60_000).toISOString();
    const { count } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .eq("from_staff", false)
      .gte("created_at", since);
    if ((count ?? 0) >= customerLimit.count) {
      return { ok: false, error: `You’ve sent a lot of messages in the last hour. For anything urgent, call us on ${site.phone}.` };
    }
  }

  const { data: row, error } = await admin
    .from("messages")
    .insert({ customer_id: customerId, sender_id: user.id, from_staff: fromStaff, body: parsed.data })
    .select(messageColumns)
    .single();
  if (error || !row) return { ok: false, error: "The message didn’t send. Try again in a moment." };

  if (fromStaff) {
    // Tell the customer like any other alert: in the app, by push and by email.
    // Only that a message is waiting: the text itself stays inside online banking.
    await admin.from("notifications").insert({
      profile_id: customerId,
      kind: "info",
      topic: "message",
      title: `New message from ${site.name}`,
      body: "You have a new secure message. Open online banking to read it.",
    });
    deliverEmailsSoon();
    revalidatePath("/admin/inbox");
  } else {
    const name = `${user.firstName} ${user.lastName}`;
    after(async () => {
      try {
        await pushToStaff({ title: `Message from ${name}`, body: "Open the staff inbox to read and reply.", url: `/admin/inbox/${user.id}`, tag: `chat-${user.id}` });
      } catch (e) {
        console.error("Staff push failed", e);
      }
    });
  }

  return { ok: true, message: toChatMessage(row as unknown as Parameters<typeof toChatMessage>[0]) };
}

/** Marks the other side's messages in a conversation as read. */
export async function markConversationRead(customerId?: string) {
  const user = await getSessionUser();
  if (!user) return;
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  if (user.role === "customer") {
    await admin.from("messages").update({ read_at: now }).eq("customer_id", user.id).eq("from_staff", true).is("read_at", null);
  } else if (customerId) {
    await admin.from("messages").update({ read_at: now }).eq("customer_id", customerId).eq("from_staff", false).is("read_at", null);
  }
}

/* ------------------------------------------------------------------ push */

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Remembers this device so notifications can be pushed to it. */
export async function savePushSubscription(input: unknown, userAgent?: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { endpoint, keys } = parsed.data;
  const { error } = await createSupabaseAdminClient()
    .from("push_subscriptions")
    .upsert(
      { profile_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: userAgent?.slice(0, 300) ?? null },
      { onConflict: "endpoint" },
    );
  return { ok: !error };
}

/** Forgets this device; it gets no more notifications. */
export async function removePushSubscription(endpoint: string) {
  const user = await getSessionUser();
  if (!user) return;
  await createSupabaseAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("profile_id", user.id);
}
