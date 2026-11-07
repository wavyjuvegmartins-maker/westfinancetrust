import type { Metadata } from "next";
import { TransferList } from "@/components/admin/transfer-tools";
import { AdminPanel, PageTitle } from "@/components/admin/ui";
import { getSessionUser } from "@/lib/auth/session";
import { listTransferQueue } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Transfer approvals" };

export default async function TransfersPage() {
  const [user, { pending, recent, missing }] = await Promise.all([getSessionUser(), listTransferQueue()]);
  const isAdmin = user?.role === "admin";
  const domestic = pending.filter((t) => t.scope === "domestic");
  const international = pending.filter((t) => t.scope === "international");

  return (
    <>
      <PageTitle title="Transfer approvals">
        Customers’ transfers to other banks. The money is already held from their account. Send each one, then approve it, or reject it with a reason they’ll see.
      </PageTitle>
      {!isAdmin && <p className="mb-4 rounded-2xl bg-amber-soft px-4 py-3 text-sm text-amber-ink">Only an admin can approve or reject transfers.</p>}
      {missing && (
        <p className="mb-4 rounded-2xl bg-negative/10 px-4 py-3 text-sm text-negative">
          Transfers aren’t set up yet. Run supabase/migrations/20261107000001_external_transfers.sql in the Supabase SQL Editor.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <AdminPanel aria-labelledby="transfers-domestic-title">
          <h2 id="transfers-domestic-title" className="mb-1 font-heading text-lg font-semibold text-ink">
            US banks <span className="text-slate">({domestic.length})</span>
          </h2>
          <p className="mb-2 text-sm text-slate">Check the routing and account number, send it, then approve.</p>
          {domestic.length ? (
            <TransferList transfers={domestic} canReview={isAdmin} />
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">Nothing to approve.</p>
          )}
        </AdminPanel>

        <AdminPanel aria-labelledby="transfers-intl-title">
          <h2 id="transfers-intl-title" className="mb-1 font-heading text-lg font-semibold text-ink">
            International <span className="text-slate">({international.length})</span>
          </h2>
          <p className="mb-2 text-sm text-slate">Customers are told these take 7 days to process.</p>
          {international.length ? (
            <TransferList transfers={international} canReview={isAdmin} />
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">Nothing to approve.</p>
          )}
        </AdminPanel>

        <AdminPanel aria-labelledby="transfers-recent-title" className="lg:col-span-2">
          <h2 id="transfers-recent-title" className="mb-2 font-heading text-lg font-semibold text-ink">Recently decided</h2>
          {recent.length ? (
            <TransferList transfers={recent} canReview={false} />
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">No transfers decided yet.</p>
          )}
        </AdminPanel>
      </div>
    </>
  );
}
