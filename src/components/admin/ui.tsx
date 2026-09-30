import { cn } from "@/lib/utils";

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function AdminPanel({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rounded-[1.5rem] bg-panel p-5 ring-1 ring-line/70 sm:p-6 dark:ring-white/[0.06]", className)} {...props}>
      {children}
    </section>
  );
}

export function PageTitle({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink">{title}</h1>
        {children && <p className="mt-1 text-slate">{children}</p>}
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
