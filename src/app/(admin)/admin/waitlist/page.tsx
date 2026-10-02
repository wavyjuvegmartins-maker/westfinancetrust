import type { Metadata } from "next";
import { EmailWaitlistButton } from "@/components/admin/customer-tools";
import { AdminPanel, PageTitle, Pill } from "@/components/admin/ui";
import { waitlistSummary } from "@/lib/admin/queries";
import { getSessionUser } from "@/lib/auth/session";
import { loanProducts } from "@/lib/rates";

export const metadata: Metadata = { title: "Loan waitlist" };

export default async function WaitlistPage() {
  const [user, rows] = await Promise.all([getSessionUser(), waitlistSummary()]);
  const isAdmin = user?.role === "admin";

  return (
    <>
      <PageTitle title="Loan waitlist">
        People who asked to hear when a loan opens, from the website or online banking. When a loan goes live, an admin emails its
        waitlist once. The email tells them to apply by phone or at the branch.
      </PageTitle>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {rows.map((r) => {
          const name = loanProducts.find((l) => l.id === r.product)?.name ?? r.product;
          return (
            <li key={r.product}>
              <AdminPanel>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-lg font-semibold text-ink">{name}</p>
                    <p className="mt-0.5 text-sm text-slate">
                      {r.total} on the list{r.total > 0 && `, ${r.waiting} not yet emailed`}
                    </p>
                  </div>
                  {r.total > 0 && r.waiting === 0 && <Pill className="bg-positive/10 text-positive">All emailed</Pill>}
                </div>
                {isAdmin && r.waiting > 0 && (
                  <div className="mt-4">
                    <EmailWaitlistButton product={r.product} name={name} count={r.waiting} />
                  </div>
                )}
              </AdminPanel>
            </li>
          );
        })}
      </ul>
    </>
  );
}
