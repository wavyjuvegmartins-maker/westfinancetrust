import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Reads for secure messages. Callers check who is asking first (the dashboard and
// admin layouts already do); these use the secret key so a staff sender's first
// name can be shown to the customer without opening up staff profiles.

export type ChatMessage = {
  id: string;
  fromStaff: boolean;
  body: string;
  createdAt: string;
  readAt: string | null;
  /** First name of the member of staff who wrote it. */
  staffName: string | null;
};

type Row = {
  id: string;
  from_staff: boolean;
  body: string;
  created_at: string;
  read_at: string | null;
  sender: { first_name: string } | null;
};

export const toChatMessage = (r: Row): ChatMessage => ({
  id: r.id,
  fromStaff: r.from_staff,
  body: r.body,
  createdAt: r.created_at,
  readAt: r.read_at,
  staffName: r.from_staff ? (r.sender?.first_name ?? null) : null,
});

export const messageColumns = "id, from_staff, body, created_at, read_at, sender:profiles!messages_sender_id_fkey(first_name)";

/** The latest messages in one customer's conversation, oldest first. */
export async function loadThread(customerId: string, limit = 200): Promise<ChatMessage[]> {
  const { data } = await createSupabaseAdminClient()
    .from("messages")
    .select(messageColumns)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  return (data ?? []).reverse().map(toChatMessage);
}

/** Staff replies the customer hasn't opened yet. */
export async function unreadForCustomer(customerId: string) {
  const { count } = await createSupabaseAdminClient()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("from_staff", true)
    .is("read_at", null);
  return count ?? 0;
}

/** Customer messages no member of staff has opened yet, across every conversation. */
export async function unreadForStaff() {
  const { count } = await createSupabaseAdminClient()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("from_staff", false)
    .is("read_at", null);
  return count ?? 0;
}

export type Conversation = {
  customerId: string;
  name: string;
  userId: string;
  lastBody: string;
  lastAt: string;
  lastFromStaff: boolean;
  unread: number;
};

/** Every conversation, most recent first, for the staff inbox. */
export async function listConversations(): Promise<Conversation[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("messages")
    .select("customer_id, body, from_staff, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(2000)
    .returns<{ customer_id: string; body: string; from_staff: boolean; created_at: string; read_at: string | null }[]>();

  const byCustomer = new Map<string, Conversation>();
  for (const m of data ?? []) {
    let c = byCustomer.get(m.customer_id);
    if (!c) {
      c = { customerId: m.customer_id, name: "", userId: "", lastBody: m.body, lastAt: m.created_at, lastFromStaff: m.from_staff, unread: 0 };
      byCustomer.set(m.customer_id, c);
    }
    if (!m.from_staff && !m.read_at) c.unread++;
  }
  if (!byCustomer.size) return [];

  const { data: people } = await admin
    .from("profiles")
    .select("id, first_name, last_name, user_id")
    .in("id", [...byCustomer.keys()])
    .returns<{ id: string; first_name: string; last_name: string; user_id: string }[]>();
  for (const p of people ?? []) {
    const c = byCustomer.get(p.id)!;
    c.name = `${p.first_name} ${p.last_name}`;
    c.userId = p.user_id;
  }
  return [...byCustomer.values()];
}
