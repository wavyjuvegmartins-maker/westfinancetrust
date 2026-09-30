import { DAY, isSpend, spendCategories, type BankState, type Bill, type SpendCategory, type Txn } from "@/components/dashboard/data";

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const monthStart = (offset = 0, now = new Date()) => new Date(now.getFullYear(), now.getMonth() + offset, 1);

export const totalBalance = (s: BankState, filter: string = "all") =>
  s.accounts.filter((a) => filter === "all" || a.id === filter).reduce((sum, a) => sum + a.balance, 0);

export const accountById = (s: BankState, id: string) => s.accounts.find((a) => a.id === id)!;

export type Point = { date: Date; value: number };

/** End-of-day balance for each of the last `days` days, derived backwards from today's balance. */
export function balanceSeries(s: BankState, filter: string, days: number): Point[] {
  const current = totalBalance(s, filter);
  const txns = s.txns.filter((t) => filter === "all" || t.account === filter);
  const today = startOfDay(new Date());
  const points: Point[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const end = new Date(today.getTime() - i * DAY + DAY - 1);
    const after = txns.reduce((sum, t) => (new Date(t.date) > end ? sum + t.amount : sum), 0);
    points.push({ date: i === 0 ? new Date() : end, value: current - after });
  }
  return points;
}

/** Spending by category for a calendar month (0 = this month, -1 = last month). */
export function monthSpend(s: BankState, offset = 0) {
  const from = monthStart(offset);
  const to = monthStart(offset + 1);
  const byCat = Object.fromEntries(spendCategories.map((c) => [c.id, 0])) as Record<SpendCategory, number>;
  for (const t of s.txns) {
    const d = new Date(t.date);
    if (d >= from && d < to && t.amount < 0 && isSpend(t.category)) byCat[t.category] += -t.amount;
  }
  const total = Object.values(byCat).reduce((a, b) => a + b, 0);
  return { total, byCat };
}

/** Same point in last month, so "this month so far" compares like with like. */
export function lastMonthToDate(s: BankState) {
  const now = new Date();
  const from = monthStart(-1);
  const to = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59);
  return s.txns
    .filter((t) => {
      const d = new Date(t.date);
      return d >= from && d <= to && t.amount < 0 && isSpend(t.category);
    })
    .reduce((sum, t) => sum - t.amount, 0);
}

export type CashflowMonth = { key: string; label: string; moneyIn: number; moneyOut: number };

/** Money in (salary, interest) vs money out (spending, bills, payments to people), by month. */
export function cashflow(s: BankState, months = 6): CashflowMonth[] {
  const out: CashflowMonth[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const from = monthStart(-i);
    const to = monthStart(-i + 1);
    let moneyIn = 0;
    let moneyOut = 0;
    for (const t of s.txns) {
      const d = new Date(t.date);
      if (d < from || d >= to) continue;
      if (t.amount > 0 && (t.category === "income" || t.category === "interest")) moneyIn += t.amount;
      if (t.amount < 0 && (isSpend(t.category) || t.category === "p2p")) moneyOut += -t.amount;
    }
    out.push({
      key: `${from.getFullYear()}-${from.getMonth()}`,
      label: from.toLocaleDateString("en-US", { month: "short" }),
      moneyIn,
      moneyOut,
    });
  }
  return out;
}

export type UpcomingBill = Bill & { due: Date; paid: boolean; failed: boolean; daysLeft: number };

/** Each bill's next due date, and whether this month's has been paid. */
export function upcomingBills(s: BankState): UpcomingBill[] {
  const now = new Date();
  const today = startOfDay(now);
  return s.bills
    .map((b) => {
      const paid = b.status === "paid";
      // A failed autopay stays on this month (overdue) until it's paid.
      const failed = b.status === "failed";
      let due = new Date(now.getFullYear(), now.getMonth(), b.dueDay);
      if (paid || (due < today && !failed)) due = new Date(now.getFullYear(), now.getMonth() + 1, b.dueDay);
      const daysLeft = Math.round((startOfDay(due).getTime() - today.getTime()) / DAY);
      return { ...b, due, paid, failed, daysLeft };
    })
    .sort((a, b) => a.due.getTime() - b.due.getTime());
}

export const cardSpentToday = (s: BankState) => {
  if (!s.card) return 0;
  const today = startOfDay(new Date());
  return s.txns
    .filter((t) => t.method === "card" && t.amount < 0 && new Date(t.date) >= today)
    .reduce((sum, t) => sum - t.amount, 0);
};

/** Groups transactions by calendar day, newest first. */
export function groupByDay(txns: Txn[]) {
  const groups: { day: Date; items: Txn[]; net: number }[] = [];
  for (const t of txns) {
    const day = startOfDay(new Date(t.date));
    const last = groups[groups.length - 1];
    if (last && last.day.getTime() === day.getTime()) {
      last.items.push(t);
      last.net += t.amount;
    } else groups.push({ day, items: [t], net: t.amount });
  }
  return groups;
}

export function dayLabel(d: Date) {
  const today = startOfDay(new Date());
  const diff = Math.round((today.getTime() - startOfDay(d).getTime()) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

/** Interest earned on savings and the certificate since the start of this month, to the second. */
export function interestThisMonth(s: BankState, now = Date.now()) {
  const elapsedDays = (now - monthStart(0).getTime()) / DAY;
  return s.accounts.reduce((sum, a) => sum + (a.apy ? (a.balance * a.apy) / 100 / 365 : 0) * elapsedDays, 0);
}

export const interestPerSecond = (s: BankState) =>
  s.accounts.reduce((sum, a) => sum + (a.apy ? (a.balance * a.apy) / 100 / 365 / 86_400 : 0), 0);
