import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { JobsPanel } from "@/components/admin/jobs-panel";
import { PushToggle } from "@/components/app/push-toggle";
import { AdminPanel, SignedMoney, money, shortDate } from "@/components/admin/ui";
import { getSessionUser } from "@/lib/auth/session";
import { getOverview, lastInterestRun } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverview() {
  const [user, o, lastInterest] = await Promise.all([getSessionUser(), getOverview(), lastInterestRun()]);

  const stats = [
    { label: "Customers", value: o.customers.toLocaleString("en-US"), note: `${o.awaitingFirstLogin} awaiting first login${o.suspended ? `, ${o.suspended} suspended` : ""}` },
    { label: "Open accounts", value: o.accounts.toLocaleString("en-US"), note: "Checking, savings, certificates" },
    { label: "Cash today", value: money(o.depositsToday - o.withdrawalsToday), note: `${money(o.depositsToday)} in, ${money(o.withdrawalsToday)} out`, wide: true },
  ];

  return (
    <>
      {/* The bank at a glance. On phones it runs edge to edge under the navy app bar. */}
      <section
        aria-labelledby="overview-title"
        className="relative overflow-hidden rounded-[1.75rem] bg-deep p-5 text-white ring-1 ring-white/5 max-lg:-mx-4 max-lg:-mt-5 max-lg:rounded-t-none max-lg:rounded-b-[2rem] max-lg:ring-0 sm:p-7 sm:max-lg:-mx-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 id="overview-title" className="font-heading text-lg font-semibold tracking-[-0.02em] text-white/90">
              Hello, {user?.firstName ?? "there"}
            </h1>
            <p className="mt-4 text-sm text-white/60">Total deposits held</p>
            <p className="figures mt-1 font-heading text-[clamp(2.2rem,9vw,3.4rem)] leading-none font-semibold tracking-[-0.04em]">{money(o.deposits)}</p>
            <p className="mt-2 text-sm text-white/55">Across every open account</p>
          </div>
          <Link href="/admin/customers/new" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-amber px-5 text-sm font-semibold text-deep transition-colors hover:bg-amber-strong max-lg:hidden">
            <UserPlus className="size-4" aria-hidden /> Register a customer
          </Link>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-[1.25rem] bg-white/[0.06] p-3.5 ring-1 ring-white/10 sm:p-4 ${s.wide ? "col-span-2 sm:col-span-1" : ""}`}>
              <dt className="text-xs font-medium text-white/60">{s.label}</dt>
              <dd className="figures mt-1.5 font-heading text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{s.value}</dd>
              <dd className="mt-1 text-xs leading-snug text-white/50">{s.note}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-[1.4fr_1fr] lg:gap-5">
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
                  <SignedMoney amount={t.amount} className="text-sm" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">
              No deposits or withdrawals yet. Open a customer and use Deposit or Withdraw on one of their accounts.
            </p>
          )}
        </AdminPanel>

        <div className="grid min-w-0 content-start gap-4 lg:gap-5">
          <AdminPanel className="max-lg:hidden">
            <PushToggle />
          </AdminPanel>
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
