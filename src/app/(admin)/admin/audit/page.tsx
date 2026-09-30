import type { Metadata } from "next";
import Link from "next/link";
import { AdminPanel, PageTitle, money, shortDate } from "@/components/admin/ui";
import { listAudit } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Audit log" };

const actionLabel: Record<string, string> = {
  register_customer: "Registered a customer",
  open_account: "Opened an account",
  deposit: "Posted a deposit",
  withdrawal: "Posted a withdrawal",
  reset_password: "Reset a password",
  suspend: "Suspended a login",
  reactivate: "Reactivated a login",
  add_payee: "Added a payee",
  remove_payee: "Removed a payee",
  customer_remove_payee: "Payee removed by customer",
  replace_card: "Card replaced by customer",
  post_interest: "Paid monthly interest",
  email_waitlist: "Emailed a loan waitlist",
};

export default async function AuditPage() {
  const rows = await listAudit();

  return (
    <>
      <PageTitle title="Audit log">Every registration, account opening, deposit and withdrawal, with who did it. Visible to admins only.</PageTitle>
      <AdminPanel className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-slate">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate">
                <tr className="border-b border-line">
                  <th scope="col" className="px-5 py-3 font-medium">When</th>
                  <th scope="col" className="px-5 py-3 font-medium">Who</th>
                  <th scope="col" className="px-5 py-3 font-medium">What</th>
                  <th scope="col" className="px-5 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const d = r.details as { amount?: number; description?: string; user_id?: string; name?: string; type?: string; reason?: string; account_mask?: string; added_via?: string };
                  const detail = [
                    d.amount !== undefined ? money(Number(d.amount)) : null,
                    d.description,
                    d.user_id ? `login ${d.user_id}` : null,
                    d.type,
                    d.name,
                    d.account_mask ? `••${d.account_mask}` : null,
                    d.added_via ? (d.added_via === "phone" ? "by phone" : "in branch") : null,
                    d.reason,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <tr key={r.id}>
                      <td className="px-5 py-3 whitespace-nowrap text-slate">{shortDate(r.created_at)}</td>
                      <td className="px-5 py-3 text-ink">{r.actor ? `${r.actor.first_name} ${r.actor.last_name}` : "System"}</td>
                      <td className="px-5 py-3 font-medium text-ink">
                        {r.target_type === "profile" && r.target_id ? (
                          <Link href={`/admin/customers/${r.target_id}`} className="hover:text-amber-ink">
                            {actionLabel[r.action] ?? r.action}
                          </Link>
                        ) : (
                          (actionLabel[r.action] ?? r.action)
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate">{detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </>
  );
}
