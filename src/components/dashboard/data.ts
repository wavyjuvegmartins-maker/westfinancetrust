import {
  ArrowLeftRight,
  Car,
  CircleEllipsis,
  Clapperboard,
  Coffee,
  Landmark,
  Receipt,
  Send,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ types */

export type AccountType = "checking" | "savings" | "certificate";

export type Account = {
  id: string; // database id
  type: AccountType;
  name: string;
  short: string; // "Checking", or "Checking ••7702" if the customer has two
  number: string;
  mask: string; // last 4 of the account number
  balance: number;
  apy?: number;
  maturesOn?: string;
  canTransact: boolean; // false for view-only access
};

export type SpendCategory = "groceries" | "dining" | "transport" | "shopping" | "bills" | "entertainment" | "other";
export type CategoryId = SpendCategory | "income" | "interest" | "transfer" | "p2p";

export type Txn = {
  id: string;
  date: string; // ISO
  merchant: string;
  category: CategoryId;
  amount: number; // negative = money out
  account: string; // account id
  status: "pending" | "posted";
  method: "card" | "transfer" | "deposit" | "cash" | "bill" | "interest" | "p2p" | "other";
  note?: string;
  reference: string;
};

export type Goal = { id: string; name: string; target: number; saved: number; accountId: string };
export type Payee = { id: string; name: string; bank: string; mask: string };
export type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  autopay: boolean;
  category: SpendCategory;
  payFrom: string | null; // account id; null = main checking
  status: "paid" | "failed" | null; // this month's payment
};

export type CardState = {
  id: string;
  last4: string;
  expiry: string;
  frozen: boolean;
  online: boolean;
  contactless: boolean;
  atm: boolean;
  abroad: boolean;
  dailyLimit: number;
};

export type Notice = {
  id: string;
  kind: "payment" | "security" | "deposit" | "info" | "blocked";
  title: string;
  body: string;
  date: string;
  read: boolean;
};

export type Prefs = {
  largePayments: boolean;
  lowBalance: boolean;
  loginAlerts: boolean;
  weeklySummary: boolean;
  activityEmails: boolean;
};

export type BankState = {
  accounts: Account[];
  txns: Txn[];
  goals: Goal[];
  payees: Payee[];
  bills: Bill[];
  card: CardState | null;
  notices: Notice[];
  prefs: Prefs;
  hideBalances: boolean;
  loanWaitlist: string[];
  monthlyBudget: number;
};

/* ------------------------------------------------------------- categories */

// Fixed slot order: colour follows the category, never its rank (validated palette, see globals.css).
export const spendCategories: { id: SpendCategory; label: string; icon: LucideIcon; color: string }[] = [
  { id: "groceries", label: "Groceries", icon: ShoppingBasket, color: "var(--cat-1)" },
  { id: "dining", label: "Eating out", icon: Coffee, color: "var(--cat-2)" },
  { id: "transport", label: "Transport", icon: Car, color: "var(--cat-3)" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, color: "var(--cat-4)" },
  { id: "bills", label: "Bills and rent", icon: Receipt, color: "var(--cat-5)" },
  { id: "entertainment", label: "Entertainment", icon: Clapperboard, color: "var(--cat-6)" },
  { id: "other", label: "Other", icon: CircleEllipsis, color: "var(--cat-7)" },
];

export const categoryMeta: Record<CategoryId, { label: string; icon: LucideIcon }> = {
  ...Object.fromEntries(spendCategories.map((c) => [c.id, { label: c.label, icon: c.icon }])),
  income: { label: "Money in", icon: Landmark },
  interest: { label: "Interest", icon: Sparkles },
  transfer: { label: "Between your accounts", icon: ArrowLeftRight },
  p2p: { label: "Sent to someone", icon: Send },
} as Record<CategoryId, { label: string; icon: LucideIcon }>;

export const isSpend = (c: CategoryId): c is SpendCategory => spendCategories.some((s) => s.id === c);

export const allCategories = [...spendCategories.map((c) => c.id), "income", "interest", "transfer", "p2p"] as const;

/* ---------------------------------------------------------------- helpers */

export const DAY = 86_400_000;
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** The customer's main everyday account, used as the default "from" account. */
export const primaryChecking = (s: BankState) =>
  s.accounts.find((a) => a.type === "checking" && a.canTransact) ?? s.accounts.find((a) => a.canTransact) ?? null;

/** Accounts money can be sent from: not certificates, and not view-only. */
export const spendableAccounts = (s: BankState) => s.accounts.filter((a) => a.type !== "certificate" && a.canTransact);
