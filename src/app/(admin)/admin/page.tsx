import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { JobsPanel } from "@/components/admin/jobs-panel";
import { AdminPanel, PageTitle, money, shortDate } from "@/components/admin/ui";
import { getSessionUser } from "@/lib/auth/session";
import { getOverview, lastInterestRun } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverview() {
  const [user, o, lastInterest] = await Promise.all([getSessionUser(), getOverview(), lastInterestRun()]);

  const stats = [
    { label: "Customers", value: o.customers.toLocaleString("en-US"), note: `${o.awaitingFirstLogin} awaiting first login${o.suspended ? `, ${o.suspended} suspended` : ""}` },
    { label: "Open accounts", value: o.accounts.toLocaleString("en-US"), note: "Checking, savings and certificates" },
    { label: "Total deposits held", value: money(o.deposits), note: "Across every account" },
    { label: "Cash today", value: money(o.depositsToday - o.withdrawalsToday), note: `${money(o.depositsToday)} in, ${money(o.withdrawalsToday)} out` },
  ];

  return (
    <>
      <PageTitle
        title={`Hello, ${user?.firstName ?? "there"}`}
        action={
          <Link href="/admin/customers/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-surface hover:bg-ink/85">
            <UserPlus className="size-4" aria-hidden /> Register a customer
          </Link>
        }
      >
        Register customers, open accounts and post branch deposits and withdrawals.
      </PageTitle>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <AdminPanel key={s.label}>
            <p className="text-sm text-slate">{s.label}</p>
            <p className="figures mt-2 font-heading text-[1.9rem] leading-none font-semibold tracking-[-0.03em] text-ink">{s.value}</p>
            <p className="mt-2 text-xs text-slate">{s.note}</p>
          </AdminPanel>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <AdminPanel aria-labelledby="cash-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="cash-title" className="font-heading text-lg font-semibold text-ink">Latest deposits and withdrawals</h2>
          </div>
          {o.recentCash.length ? (
            <ul className="divide-y divide-line">
              {o.recentCash.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{t.description}</span>
                    <span className="text-xs text-slate">
                      {t.account ? `${t.account.name} ${t.account.account_number}` : "Account"}, {shortDate(t.created_at)}
                    </span>
                  </span>
                  <span className={cn("figures text-sm font-semibold", t.amount > 0 ? "text-positive" : "text-ink")}>
                    {t.amount > 0 ? "+" : "−"}
                    {money(Math.abs(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">
              No deposits or withdrawals yet. Open a customer and use Deposit or Withdraw on one of their accounts.
            </p>
          )}
        </AdminPanel>

        <div className="grid content-start gap-5">
          <JobsPanel lastInterest={lastInterest} isAdmin={user?.role === "admin"} />
          <AdminPanel>
            <h2 className="font-heading text-lg font-semibold text-ink">How to register a customer</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate">
              <li>1. Check their photo ID and proof of address in person.</li>
              <li>2. Register them and choose the accounts to open.</li>
              <li>3. Their login ID and a one-time password are emailed to them.</li>
              <li>4. At first login they choose their own password.</li>
            </ol>
          </AdminPanel>
          <Link href="/admin/messages" className="block">
            <AdminPanel className="flex items-center justify-between transition-colors hover:bg-paper">
              <span>
                <span className="block font-heading text-lg font-semibold text-ink">Website messages</span>
                <span className="text-sm text-slate">{o.openMessages ? `${o.openMessages} waiting for a reply` : "All caught up"}</span>
              </span>
              <ArrowRight className="size-5 text-slate" aria-hidden />
            </AdminPanel>
          </Link>
        </div>
      </div>
    </>
  );
}
