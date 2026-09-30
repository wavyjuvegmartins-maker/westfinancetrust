import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard } from "lucide-react";
import { AddPayeeButton, CashButtons, LoginTools, OpenAccountButton, RemovePayeeButton } from "@/components/admin/customer-tools";
import { AdminPanel, Pill, StatusPill, money, shortDate, txnLabel } from "@/components/admin/ui";
import { getSessionUser } from "@/lib/auth/session";
import { getCustomer } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

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

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink">
              {c.first_name} {c.last_name}
            </h1>
            <StatusPill status={c.status} mustChange={c.must_change_password} />
          </div>
          <p className="mt-1 text-slate">
            Login ID <span className="font-semibold text-ink">{c.user_id}</span>, customer since{" "}
            {new Date(c.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        <p className="text-right">
          <span className="block text-sm text-slate">Total balance</span>
          <span className="figures font-heading text-2xl font-semibold text-ink">{money(total)}</span>
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-5">
          <AdminPanel aria-labelledby="accounts-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="accounts-title" className="font-heading text-lg font-semibold text-ink">Accounts</h2>
              <OpenAccountButton profileId={c.id} isAdmin={isAdmin} existing={c.accounts.map((a) => a.type)} />
            </div>
            {c.accounts.length ? (
              <ul className="grid gap-3">
                {c.accounts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-canvas px-4 py-4">
                    <span>
                      <span className="block font-semibold text-ink">{a.name}</span>
                      <span className="text-xs text-slate">
                        No. {a.account_number}
                        {a.apy !== null ? `, ${a.apy.toFixed(2)}% APY` : ""}
                        {a.status !== "active" ? `, ${a.status}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-4">
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

          <AdminPanel aria-labelledby="ledger-title">
            <h2 id="ledger-title" className="mb-4 font-heading text-lg font-semibold text-ink">Recent activity</h2>
            {txns.length ? (
              <div className="overflow-x-auto">
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
                        <td className={cn("figures py-2.5 pr-4 text-right font-semibold whitespace-nowrap", t.amount > 0 ? "text-positive" : "text-ink")}>
                          {t.amount > 0 ? "+" : "−"}
                          {money(Math.abs(t.amount))}
                        </td>
                        <td className="figures py-2.5 text-right whitespace-nowrap text-slate">{t.balance_after === null ? "" : money(t.balance_after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">No activity yet.</p>
            )}
          </AdminPanel>
        </div>

        <div className="grid content-start gap-5">
          <AdminPanel aria-labelledby="details-title">
            <h2 id="details-title" className="mb-3 font-heading text-lg font-semibold text-ink">Details</h2>
            <dl className="divide-y divide-line text-sm">
              {[
                ["Email", c.email],
                ["Phone", c.phone || "Not on file"],
                ["Home branch", c.branch],
              ].map(([term, detail]) => (
                <div key={term} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate">{term}</dt>
                  <dd className="text-right font-medium text-ink">{detail}</dd>
                </div>
              ))}
            </dl>
          </AdminPanel>

          <AdminPanel aria-labelledby="login-title">
            <h2 id="login-title" className="mb-3 font-heading text-lg font-semibold text-ink">Online banking login</h2>
            <LoginTools profileId={c.id} status={c.status} isAdmin={isAdmin} />
          </AdminPanel>

          <AdminPanel aria-labelledby="cards-title">
            <h2 id="cards-title" className="mb-3 font-heading text-lg font-semibold text-ink">Cards</h2>
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

          <AdminPanel aria-labelledby="payees-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="payees-title" className="font-heading text-lg font-semibold text-ink">Payees</h2>
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
