import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  allCategories,
  type Account,
  type AccountType,
  type BankState,
  type Bill,
  type CategoryId,
  type Notice,
  type SpendCategory,
  type Txn,
} from "@/components/dashboard/data";
import type { UserProfile } from "@/lib/auth/types";

/* ------------------------------------------------------ database row shapes */

type AccountRow = {
  id: string;
  account_number: string;
  type: AccountType;
  name: string;
  balance: string | number;
  apy: string | number | null;
  matures_on: string | null;
  status: "active" | "frozen" | "closed";
};

type TxnRow = {
  id: string;
  account_id: string;
  type: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "card" | "bill" | "p2p" | "interest" | "fee" | "adjustment";
  status: "pending" | "posted" | "reversed" | "declined";
  amount: string | number;
  description: string;
  category: string | null;
  note: string | null;
  reference: string;
  created_at: string;
};

type CardRow = {
  id: string;
  last4: string;
  expiry_month: number;
  expiry_year: number;
  status: "active" | "frozen" | "cancelled";
  online_payments: boolean;
  contactless: boolean;
  atm_withdrawals: boolean;
  use_abroad: boolean;
  daily_limit: string | number;
};

type SettingsRow = {
  card_payment_alerts: boolean;
  low_balance_alerts: boolean;
  login_alerts: boolean;
  weekly_summary: boolean;
  activity_emails?: boolean;
  hide_balances: boolean;
  monthly_budget: string | number;
};

const num = (v: string | number | null | undefined) => (v === null || v === undefined ? 0 : Number(v));

const methodFor: Record<TxnRow["type"], Txn["method"]> = {
  deposit: "deposit",
  withdrawal: "cash",
  transfer_in: "transfer",
  transfer_out: "transfer",
  card: "card",
  bill: "bill",
  p2p: "p2p",
  interest: "interest",
  fee: "other",
  adjustment: "other",
};

function categoryFor(row: TxnRow): CategoryId {
  if ((allCategories as readonly string[]).includes(row.category ?? "")) return row.category as CategoryId;
  if (row.type === "deposit") return "income";
  if (row.type === "interest") return "interest";
  if (row.type === "transfer_in" || row.type === "transfer_out") return "transfer";
  if (row.type === "p2p") return "p2p";
  return "other";
}

const shortName: Record<AccountType, string> = { checking: "Checking", savings: "Savings", certificate: "Certificate" };

/* ------------------------------------------------------------------ loader */

/** Everything the dashboard shows for one customer, read through row level security. */
export async function loadBank(supabase: SupabaseClient, user: UserProfile): Promise<BankState> {
  const { data: holdings, error } = await supabase
    .from("account_holders")
    .select("can_transact, accounts(*)")
    .eq("profile_id", user.id);
  if (error) throw new Error(`Couldn’t load accounts: ${error.message}`);

  const rows = (holdings ?? [])
    .map((h) => ({ canTransact: h.can_transact as boolean, account: h.accounts as unknown as AccountRow | null }))
    .filter((h): h is { canTransact: boolean; account: AccountRow } => !!h.account && h.account.status !== "closed")
    .sort((a, b) => a.account.account_number.localeCompare(b.account.account_number));

  const typeCounts = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.account.type]: (m[r.account.type] ?? 0) + 1 }), {});
  const accounts: Account[] = rows.map(({ account: a, canTransact }) => {
    const mask = a.account_number.slice(-4);
    return {
      id: a.id,
      type: a.type,
      name: a.name,
      short: typeCounts[a.type] > 1 ? `${shortName[a.type]} ••${mask}` : shortName[a.type],
      number: a.account_number,
      mask,
      balance: num(a.balance),
      apy: a.apy === null ? undefined : num(a.apy),
      maturesOn: a.matures_on ?? undefined,
      canTransact: canTransact && a.status === "active",
    };
  });
  const ids = accounts.map((a) => a.id);

  const [txns, card, payees, bills, goals, notices, settings, waitlist, billPayments] = await Promise.all([
    ids.length
      ? supabase.from("transactions").select("*").in("account_id", ids).order("created_at", { ascending: false }).limit(600)
      : Promise.resolve({ data: [] as TxnRow[] }),
    supabase.from("cards").select("*").eq("holder_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1).maybeSingle<CardRow>(),
    supabase.from("payees").select("*").eq("owner_id", user.id).order("name"),
    supabase.from("bills").select("*").eq("owner_id", user.id).order("due_day"),
    supabase.from("savings_goals").select("*").eq("owner_id", user.id).order("created_at"),
    supabase.from("notifications").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(40),
    supabase.from("user_settings").select("*").eq("profile_id", user.id).maybeSingle<SettingsRow>(),
    supabase.from("loan_waitlist").select("product").eq("profile_id", user.id),
    supabase
      .from("bill_payments")
      .select("bill_id, status")
      .eq("period_start", new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0, 10)),
  ]);

  const s = settings.data;
  const c = card.data;

  return {
    accounts,
    txns: ((txns.data ?? []) as TxnRow[])
      .filter((t) => t.status !== "declined")
      .map((t) => ({
        id: t.id,
        date: t.created_at,
        merchant: t.description,
        category: categoryFor(t),
        amount: num(t.amount),
        account: t.account_id,
        status: t.status === "pending" ? "pending" : "posted",
        method: methodFor[t.type],
        note: t.note ?? undefined,
        reference: t.reference,
      })),
    card: c
      ? {
          id: c.id,
          last4: c.last4,
          expiry: `${String(c.expiry_month).padStart(2, "0")}/${String(c.expiry_year).slice(-2)}`,
          frozen: c.status === "frozen",
          online: c.online_payments,
          contactless: c.contactless,
          atm: c.atm_withdrawals,
          abroad: c.use_abroad,
          dailyLimit: num(c.daily_limit),
        }
      : null,
    payees: (payees.data ?? []).map((p) => ({ id: p.id, name: p.name, bank: p.bank_name, mask: p.account_mask })),
    bills: (bills.data ?? []).map(
      (b): Bill => ({
        id: b.id,
        name: b.name,
        amount: num(b.amount),
        dueDay: b.due_day,
        autopay: b.autopay,
        category: (b.category as SpendCategory) ?? "bills",
        payFrom: b.pay_from ?? null,
        status: (billPayments.data ?? []).find((p) => p.bill_id === b.id)?.status ?? null,
      }),
    ),
    goals: (goals.data ?? []).map((g) => ({ id: g.id, name: g.name, target: num(g.target), saved: num(g.saved), accountId: g.account_id })),
    notices: (notices.data ?? []).map(
      (n): Notice => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, date: n.created_at, read: !!n.read_at }),
    ),
    prefs: {
      largePayments: s?.card_payment_alerts ?? true,
      lowBalance: s?.low_balance_alerts ?? true,
      loginAlerts: s?.login_alerts ?? true,
      weeklySummary: s?.weekly_summary ?? false,
      activityEmails: s?.activity_emails ?? true,
    },
    hideBalances: s?.hide_balances ?? false,
    monthlyBudget: num(s?.monthly_budget ?? 3000),
    loanWaitlist: (waitlist.data ?? []).map((w) => w.product as string),
  };
}
