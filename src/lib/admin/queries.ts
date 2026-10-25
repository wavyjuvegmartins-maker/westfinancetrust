import "server-only";
import { describeDevice } from "@/lib/auth/devices";
import { toCryptoTxn, toWallets, type CryptoTxn, type CryptoTxnRow, type CryptoWalletRow } from "@/lib/crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Reads for the admin area. They run as the signed-in staff member, so row
// level security still applies (staff can read customers, accounts and the ledger).

export type AdminAccount = {
  id: string;
  account_number: string;
  type: "checking" | "savings" | "certificate";
  name: string;
  balance: number;
  apy: number | null;
  status: string;
  opened_at: string;
};

export type AdminCustomer = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  branch: string;
  status: "active" | "suspended" | "closed";
  must_change_password: boolean;
  created_at: string;
  accounts: AdminAccount[];
};

export type AdminTxn = {
  id: string;
  type: string;
  status: string;
  amount: number;
  balance_after: number | null;
  description: string;
  reference: string;
  payer_name: string | null;
  paid_on: string | null;
  created_at: string;
  account: { account_number: string; name: string } | null;
};

const n = (v: unknown) => Number(v ?? 0);

type HolderJoin = { accounts: Omit<AdminAccount, "balance" | "apy"> & { balance: string; apy: string | null } | null };

function withAccounts(row: Record<string, unknown> & { account_holders?: HolderJoin[] }): AdminCustomer {
  const { account_holders = [], ...profile } = row;
  return {
    ...(profile as unknown as Omit<AdminCustomer, "accounts">),
    accounts: account_holders
      .map((h) => h.accounts)
      .filter((a): a is NonNullable<HolderJoin["accounts"]> => !!a)
      .map((a) => ({ ...a, balance: n(a.balance), apy: a.apy === null ? null : n(a.apy) }))
      .sort((a, b) => a.account_number.localeCompare(b.account_number)),
  };
}

const customerSelect = "*, account_holders!account_holders_profile_id_fkey(accounts(id, account_number, type, name, balance, apy, status, opened_at))";

export async function listCustomers(query = "") {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from("profiles").select(customerSelect).eq("role", "customer").order("created_at", { ascending: false }).limit(200);
  const term = query.trim().replace(/[%,()]/g, "");
  if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,user_id.ilike.%${term}%,email.ilike.%${term}%`);
  const { data } = await q;
  return (data ?? []).map((r) => withAccounts(r as never));
}

export async function getCustomer(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select(customerSelect).eq("id", id).eq("role", "customer").maybeSingle();
  if (!data) return null;
  const customer = withAccounts(data as never);
  const ids = customer.accounts.map((a) => a.id);

  const [txns, cards, payees, wallets, cryptoTxns] = await Promise.all([
    ids.length
      ? supabase
          .from("transactions")
          .select("id, type, status, amount, balance_after, description, reference, payer_name, paid_on, created_at, account:accounts!transactions_account_id_fkey(account_number, name)")
          .in("account_id", ids)
          .order("created_at", { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] }),
    supabase.from("cards").select("id, last4, expiry_month, expiry_year, status").eq("holder_id", id).order("created_at", { ascending: false }),
    supabase
      .from("payees")
      .select("id, name, bank_name, account_mask, routing_number, added_via, created_at, adder:profiles!payees_added_by_fkey(first_name, last_name)")
      .eq("owner_id", id)
      .order("name"),
    supabase.from("crypto_wallets").select("*").eq("profile_id", id),
    supabase.from("crypto_transactions").select("*").eq("profile_id", id).order("created_at", { ascending: false }).limit(40),
  ]);

  return {
    customer,
    txns: ((txns.data ?? []) as unknown as AdminTxn[]).map((t) => ({ ...t, amount: n(t.amount), balance_after: t.balance_after === null ? null : n(t.balance_after) })),
    cards: (cards.data ?? []) as { id: string; last4: string; expiry_month: number; expiry_year: number; status: string }[],
    payees: (payees.data ?? []) as unknown as {
      id: string;
      name: string;
      bank_name: string;
      account_mask: string;
      routing_number: string | null;
      added_via: "phone" | "branch" | null;
      created_at: string;
      adder: { first_name: string; last_name: string } | null;
    }[],
    crypto: {
      wallets: toWallets((wallets.data ?? []) as CryptoWalletRow[]),
      txns: ((cryptoTxns.data ?? []) as CryptoTxnRow[]).map(toCryptoTxn),
    },
  };
}

export type AdminCryptoTxn = CryptoTxn & { customer: { id: string; first_name: string; last_name: string; user_id: string } | null };

const cryptoCustomer = "customer:profiles!crypto_transactions_profile_id_fkey(id, first_name, last_name, user_id)";

/** Customer crypto deposits and withdrawals waiting for an admin, oldest first, and the latest ones decided. */
export async function listCryptoQueue() {
  const supabase = await createSupabaseServerClient();
  const [pending, recent] = await Promise.all([
    supabase.from("crypto_transactions").select(`*, ${cryptoCustomer}`).eq("status", "pending").order("created_at").limit(200),
    supabase.from("crypto_transactions").select(`*, ${cryptoCustomer}`).neq("status", "pending").order("created_at", { ascending: false }).limit(30),
  ]);
  const map = (rows: unknown[] | null) =>
    ((rows ?? []) as (CryptoTxnRow & { customer: AdminCryptoTxn["customer"] })[]).map((r) => ({ ...toCryptoTxn(r), customer: r.customer }));
  return { pending: map(pending.data), recent: map(recent.data) };
}

export async function pendingCryptoCount() {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("crypto_transactions").select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

export async function getOverview() {
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [customers, accounts, todayCash, recent, messages] = await Promise.all([
    supabase.from("profiles").select("id, status, must_change_password").eq("role", "customer"),
    supabase.from("accounts").select("balance, status"),
    supabase.from("transactions").select("type, amount").in("type", ["deposit", "withdrawal"]).gte("created_at", today.toISOString()),
    supabase
      .from("transactions")
      .select("id, type, status, amount, balance_after, description, reference, payer_name, paid_on, created_at, account:accounts!transactions_account_id_fkey(account_number, name)")
      .in("type", ["deposit", "withdrawal"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("contact_messages").select("id").is("handled_at", null),
  ]);

  const people = customers.data ?? [];
  const cash = todayCash.data ?? [];
  return {
    customers: people.length,
    awaitingFirstLogin: people.filter((p) => p.must_change_password).length,
    suspended: people.filter((p) => p.status === "suspended").length,
    accounts: (accounts.data ?? []).filter((a) => a.status !== "closed").length,
    deposits: (accounts.data ?? []).reduce((sum, a) => sum + n(a.balance), 0),
    depositsToday: cash.filter((t) => t.type === "deposit").reduce((s, t) => s + n(t.amount), 0),
    withdrawalsToday: cash.filter((t) => t.type === "withdrawal").reduce((s, t) => s - n(t.amount), 0),
    recentCash: ((recent.data ?? []) as unknown as AdminTxn[]).map((t) => ({ ...t, amount: n(t.amount) })),
    openMessages: (messages.data ?? []).length,
  };
}

/** The most recent month interest was paid for, and how much. */
export async function lastInterestRun() {
  const supabase = await createSupabaseServerClient();
  const { data: latest } = await supabase
    .from("interest_runs")
    .select("period_start")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle<{ period_start: string }>();
  if (!latest) return null;
  const { data: rows } = await supabase.from("interest_runs").select("amount, posted_at").eq("period_start", latest.period_start);
  return {
    month: latest.period_start,
    total: (rows ?? []).reduce((s, r) => s + n(r.amount), 0),
    accounts: (rows ?? []).filter((r) => n(r.amount) > 0).length,
    postedAt: (rows ?? []).map((r) => r.posted_at as string).sort().at(-1) ?? null,
  };
}

export async function listAudit(limit = 150) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, target_type, target_id, details, created_at, actor:profiles!audit_log_actor_id_fkey(first_name, last_name, user_id)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as {
    id: number;
    action: string;
    target_type: string;
    target_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
    actor: { first_name: string; last_name: string; user_id: string } | null;
  }[];
}

export async function listMessages() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100);
  return (data ?? []) as {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    topic: string;
    message: string;
    handled_at: string | null;
    created_at: string;
  }[];
}

/** How many people wait for each loan, and how many of them haven't been emailed that it's open. */
export async function waitlistSummary() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("loan_waitlist").select("product, notified_at");
  const rows = (data ?? []) as { product: string; notified_at: string | null }[];
  return (["personal", "auto", "home", "business"] as const).map((product) => {
    const mine = rows.filter((r) => r.product === product);
    return { product, total: mine.length, waiting: mine.filter((r) => !r.notified_at).length };
  });
}

/* ---------------------------------------------------------------- devices */

// Device requests and known devices are readable by admins only (row level security), IP addresses included.

export type AdminDeviceRequest = {
  id: string;
  status: "pending" | "approved" | "denied" | "used" | "cancelled";
  ip: string | null;
  user_agent: string | null;
  device: string;
  deny_reason: string | null;
  created_at: string;
  decided_at: string | null;
  expires_at: string;
  customer: { id: string; first_name: string; last_name: string; user_id: string; phone: string | null } | null;
  decider: { first_name: string; last_name: string } | null;
};

const deviceRequestSelect =
  "id, status, ip, user_agent, deny_reason, created_at, decided_at, expires_at, customer:profiles!device_login_requests_profile_id_fkey(id, first_name, last_name, user_id, phone), decider:profiles!device_login_requests_decided_by_fkey(first_name, last_name)";

const withDevice = (rows: unknown[] | null) =>
  ((rows ?? []) as Omit<AdminDeviceRequest, "device">[]).map((r) => ({ ...r, device: describeDevice(r.user_agent ?? "") }));

/** Sign-ins waiting for approval, oldest first, and the latest ones decided. */
export async function listDeviceQueue() {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const [pending, recent] = await Promise.all([
    supabase.from("device_login_requests").select(deviceRequestSelect).eq("status", "pending").gt("expires_at", now).order("created_at").limit(100),
    supabase.from("device_login_requests").select(deviceRequestSelect).in("status", ["approved", "denied", "used"]).order("decided_at", { ascending: false }).limit(30),
  ]);
  return { pending: withDevice(pending.data), recent: withDevice(recent.data) };
}

export async function pendingDeviceCount() {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("device_login_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());
  return count ?? 0;
}

export type AdminKnownDevice = {
  device_hash: string;
  device: string;
  user_agent: string | null;
  first_ip: string | null;
  last_ip: string | null;
  first_seen: string;
  last_seen: string;
  approver: { first_name: string; last_name: string } | null;
};

/** The browsers a customer can sign in from without approval. */
export async function customerDevices(profileId: string): Promise<AdminKnownDevice[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("known_devices")
    .select("device_hash, user_agent, first_ip, last_ip, first_seen, last_seen, approver:profiles!known_devices_approved_by_fkey(first_name, last_name)")
    .eq("profile_id", profileId)
    .order("last_seen", { ascending: false });
  return ((data ?? []) as unknown as Omit<AdminKnownDevice, "device">[]).map((d) => ({ ...d, device: describeDevice(d.user_agent ?? "") }));
}
