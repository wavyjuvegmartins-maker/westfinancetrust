import { cn } from "@/lib/utils";

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function AdminPanel({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("min-w-0 rounded-[1.5rem] bg-panel p-4.5 ring-1 ring-line/70 sm:p-6 dark:ring-white/[0.06]", className)} {...props}>
      {children}
    </section>
  );
}

export function PageTitle({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="font-heading text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-3xl">{title}</h1>
        {children && <p className="mt-1 text-sm text-slate sm:text-base">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusPill({ status, mustChange }: { status: string; mustChange?: boolean }) {
  if (status === "suspended") return <Pill className="bg-negative/10 text-negative">Suspended</Pill>;
  if (status === "closed") return <Pill className="bg-line text-slate">Closed</Pill>;
  if (mustChange) return <Pill className="bg-amber-soft text-amber-ink">Awaiting first login</Pill>;
  return <Pill className="bg-positive/10 text-positive">Active</Pill>;
}

export function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>{children}</span>;
}

export const initials = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

/** Round initials badge for a person in staff lists. */
export function PersonBadge({ first, last, className }: { first: string; last: string; className?: string }) {
  return (
    <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-soft text-sm font-semibold text-amber-ink", className)}>
      {initials(first, last)}
    </span>
  );
}

/** The amount of a transaction, green when money comes in. */
export function SignedMoney({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn("figures font-semibold whitespace-nowrap", amount > 0 ? "text-positive" : "text-ink", className)}>
      {amount > 0 ? "+" : "−"}
      {money(Math.abs(amount))}
    </span>
  );
}

/** The link-styled button used for the main action at the top of staff pages. */
export const primaryAction =
  "inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-surface transition-colors hover:bg-ink/85";

export const txnLabel: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  card: "Card",
  bill: "Bill",
  p2p: "Payment",
  interest: "Interest",
  fee: "Fee",
  adjustment: "Adjustment",
};
