import type { Metadata } from "next";
import { CryptoTxnList } from "@/components/admin/crypto-list";
import { AdminPanel, PageTitle } from "@/components/admin/ui";
import { getSessionUser } from "@/lib/auth/session";
import { listCryptoQueue } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Crypto approvals" };

export default async function CryptoPage() {
  const [user, { pending, recent }] = await Promise.all([getSessionUser(), listCryptoQueue()]);
  const isAdmin = user?.role === "admin";
  const deposits = pending.filter((t) => t.kind === "deposit");
  const withdrawals = pending.filter((t) => t.kind === "withdrawal");

  return (
    <>
      <PageTitle title="Crypto approvals">
        Check deposits have arrived before approving them. Send withdrawals from the bank’s wallet, then mark them as sent.
      </PageTitle>
      {!isAdmin && <p className="mb-4 rounded-2xl bg-amber-soft px-4 py-3 text-sm text-amber-ink">Only an admin can approve or decline crypto.</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <AdminPanel aria-labelledby="crypto-deposits-title">
          <h2 id="crypto-deposits-title" className="mb-1 font-heading text-lg font-semibold text-ink">
            Deposits to check <span className="text-slate">({deposits.length})</span>
          </h2>
          <p className="mb-2 text-sm text-slate">The customer says they’ve sent these. Approve once they’re in the bank’s wallet.</p>
          {deposits.length ? (
            <CryptoTxnList txns={deposits} canReview={isAdmin} showCustomer />
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">Nothing to check.</p>
          )}
        </AdminPanel>

        <AdminPanel aria-labelledby="crypto-withdrawals-title">
          <h2 id="crypto-withdrawals-title" className="mb-1 font-heading text-lg font-semibold text-ink">
            Withdrawals to send <span className="text-slate">({withdrawals.length})</span>
          </h2>
          <p className="mb-2 text-sm text-slate">The coins are already held from the customer’s balance. Declining gives them back.</p>
          {withdrawals.length ? (
            <CryptoTxnList txns={withdrawals} canReview={isAdmin} showCustomer />
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">Nothing to send.</p>
          )}
        </AdminPanel>

        <AdminPanel aria-labelledby="crypto-recent-title" className="lg:col-span-2">
          <h2 id="crypto-recent-title" className="mb-2 font-heading text-lg font-semibold text-ink">Recently decided</h2>
          {recent.length ? (
            <CryptoTxnList txns={recent} canReview={false} showCustomer />
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">No crypto activity yet.</p>
          )}
        </AdminPanel>
      </div>
    </>
  );
}
