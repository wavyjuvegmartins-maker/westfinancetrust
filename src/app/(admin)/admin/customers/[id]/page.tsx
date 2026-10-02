import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, MessageCircle } from "lucide-react";
import { AddPayeeButton, CashButtons, LoginTools, OpenAccountButton, RemovePayeeButton } from "@/components/admin/customer-tools";
import { AdminPanel, PersonBadge, Pill, SignedMoney, StatusPill, money, shortDate, txnLabel } from "@/components/admin/ui";
import { getSessionUser } from "@/lib/auth/session";
import { getCustomer } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  const [user, data] = await Promise.all([getSessionUser(), getCustomer(id)]);
  if (!data) notFound();
  const { customer: c, txns, cards, payees } = data;
  const isAdmin = user?.role === "admin";
  const total = c.accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <>
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Customers
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 sm:mb-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <PersonBadge first={c.first_name} last={c.last_name} className="size-12 text-base sm:size-14 sm:text-lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-heading text-[1.6rem] leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
                {c.first_name} {c.last_name}
              </h1>
              <StatusPill status={c.status} mustChange={c.must_change_password} />
            </div>
            <p className="mt-0.5 text-sm text-slate sm:text-base">
              Login ID <span className="font-semibold text-ink">{c.user_id}</span>, since{" "}
              {new Date(c.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <Link
              href={`/admin/inbox/${c.id}`}
              className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-panel px-3.5 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-paper"
            >
              <MessageCircle className="size-4" aria-hidden /> Message {c.first_name}
            </Link>
          </div>
        </div>
        <p className="max-sm:w-full max-sm:rounded-2xl max-sm:bg-deep max-sm:px-4 max-sm:py-3.5 max-sm:text-white sm:text-right">
          <span className="block text-sm text-slate max-sm:text-white/60">Total balance</span>
          <span className="figures font-heading text-2xl font-semibold text-ink max-sm:text-[1.9rem] max-sm:tracking-[-0.03em] max-sm:text-white">{money(total)}</span>
        </p>
      </div>

      {/* Phones: jump straight to a section of this long page. */}
      <nav aria-label="Sections" className="sticky top-[calc(env(safe-area-inset-top)+4rem)] z-20 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-canvas/90 px-4 py-2 backdrop-blur-md [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden">
        {[
          ["#accounts-title", "Accounts"],
          ["#payees-title", "Payees"],
          ["#ledger-title", "Activity"],
          ["#login-title", "Login"],
          ["#cards-title", "Cards"],
          ["#details-title", "Details"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="shrink-0 rounded-full bg-panel px-3.5 py-1.5 text-sm font-semibold text-ink ring-1 ring-line">
            {label}
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr] lg:gap-5">
        <div className="grid min-w-0 content-start gap-4 max-lg:contents lg:gap-5">
          <AdminPanel aria-labelledby="accounts-title" className="max-lg:order-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="accounts-title" className="scroll-mt-32 font-heading text-lg font-semibold text-ink">Accounts</h2>
              <OpenAccountButton profileId={c.id} isAdmin={isAdmin} existing={c.accounts.map((a) => a.type)} />
            </div>
            {c.accounts.length ? (
              <ul className="grid gap-3">
                {c.accounts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl bg-canvas px-4 py-4">
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{a.name}</span>
                      <span className="text-xs text-slate">
                        No. {a.account_number}
                        {a.apy !== null ? `, ${a.apy.toFixed(2)}% APY` : ""}
                        {a.status !== "active" ? `, ${a.status}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-3 max-sm:w-full max-sm:justify-between">
                      <span className="figures font-heading text-xl font-semibold text-ink">{money(a.balance)}</span>
                      <CashButtons account={{ id: a.id, number: a.account_number, name: a.name, balance: a.balance }} canPost={isAdmin && a.status === "active"} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">No accounts yet.</p>
            )}
          </AdminPanel>

          <AdminPanel aria-labelledby="ledger-title" className="max-lg:order-3">
            <h2 id="ledger-title" className="mb-4 scroll-mt-32 font-heading text-lg font-semibold text-ink">Recent activity</h2>
            {txns.length ? (
              <>
              <ul className="-mx-1 divide-y divide-line md:hidden">
                {txns.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-3 px-1 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{t.description}</span>
                      <span className="block text-xs text-slate">
                        {txnLabel[t.type] ?? t.type}, {t.account?.name} ••{t.account?.account_number.slice(-4)}
                      </span>
                      <span className="block text-xs text-slate">{shortDate(t.created_at)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <SignedMoney amount={t.amount} className="block text-sm" />
                      {t.status === "pending" && <Pill className="mt-1 bg-amber-soft text-amber-ink">Pending</Pill>}
                      {t.balance_after !== null && <span className="figures block text-xs text-slate">{money(t.balance_after)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate">
                    <tr className="border-b border-line">
                      <th scope="col" className="py-2 pr-4 font-medium">When</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Description</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Type</th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">Amount</th>
                      <th scope="col" className="py-2 text-right font-medium">Balance after</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {txns.map((t) => (
                      <tr key={t.id}>
                        <td className="py-2.5 pr-4 whitespace-nowrap text-slate">{shortDate(t.created_at)}</td>
                        <td className="py-2.5 pr-4">
                          <span className="font-medium text-ink">{t.description}</span>
                          <span className="block text-xs text-slate">
                            {t.account?.name} {t.account?.account_number}, ref {t.reference}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate">
                          {txnLabel[t.type] ?? t.type}
                          {t.status === "pending" && <Pill className="ml-2 bg-amber-soft text-amber-ink">Pending</Pill>}
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <SignedMoney amount={t.amount} />
                        </td>
                        <td className="figures py-2.5 text-right whitespace-nowrap text-slate">{t.balance_after === null ? "" : money(t.balance_after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            ) : (
              <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">No activity yet.</p>
            )}
          </AdminPanel>
        </div>

        <div className="grid min-w-0 content-start gap-4 max-lg:contents lg:gap-5">
          <AdminPanel aria-labelledby="details-title" className="max-lg:order-6">
            <h2 id="details-title" className="scroll-mt-32 mb-3 font-heading text-lg font-semibold text-ink">Details</h2>
            <dl className="divide-y divide-line text-sm">
              {[
                ["Email", c.email],
                ["Phone", c.phone || "Not on file"],
                ["Home branch", c.branch],
              ].map(([term, detail]) => (
                <div key={term} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate">{term}</dt>
                  <dd className="min-w-0 text-right font-medium break-words text-ink">{detail}</dd>
                </div>
              ))}
            </dl>
          </AdminPanel>

          <AdminPanel aria-labelledby="login-title" className="max-lg:order-4">
            <h2 id="login-title" className="scroll-mt-32 mb-3 font-heading text-lg font-semibold text-ink">Online banking login</h2>
            <LoginTools profileId={c.id} status={c.status} isAdmin={isAdmin} />
          </AdminPanel>

          <AdminPanel aria-labelledby="cards-title" className="max-lg:order-5">
            <h2 id="cards-title" className="scroll-mt-32 mb-3 font-heading text-lg font-semibold text-ink">Cards</h2>
            {cards.length ? (
              <ul className="space-y-2">
                {cards.map((card) => (
                  <li key={card.id} className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3 text-sm">
                    <span className="flex items-center gap-2.5 text-ink">
                      <CreditCard className="size-4 text-slate" aria-hidden />
                      Debit ending {card.last4}
                      <span className="text-slate">
                        exp {String(card.expiry_month).padStart(2, "0")}/{String(card.expiry_year).slice(-2)}
                      </span>
                    </span>
                    <Pill className={card.status === "active" ? "bg-positive/10 text-positive" : card.status === "frozen" ? "bg-[#bcd7f5]/30 text-ink" : "bg-line text-slate"}>
                      {card.status}
                    </Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate">No card. One is issued automatically when a checking account is opened.</p>
            )}
          </AdminPanel>

          <AdminPanel aria-labelledby="payees-title" className="max-lg:order-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="payees-title" className="scroll-mt-32 font-heading text-lg font-semibold text-ink">Payees</h2>
              <AddPayeeButton profileId={c.id} customerName={c.first_name} />
            </div>
            {payees.length ? (
              <ul className="divide-y divide-line text-sm">
                {payees.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">{p.name}</span>
                      <span className="block text-slate">
                        {p.bank_name} ••{p.account_mask}
                        {p.routing_number ? `, routing ${p.routing_number}` : ""}
                      </span>
                      <span className="block text-xs text-slate">
                        Added {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {p.added_via ? (p.added_via === "phone" ? " by phone" : " in branch") : ""}
                        {p.adder ? ` by ${p.adder.first_name} ${p.adder.last_name}` : ""}
                      </span>
                    </span>
                    <RemovePayeeButton payeeId={p.id} name={p.name} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate">No payees yet. Add the people and businesses the customer asks to pay.</p>
            )}
          </AdminPanel>
        </div>
      </div>
    </>
  );
}
