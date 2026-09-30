import type { Metadata } from "next";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { AdminPanel, PageTitle, StatusPill, money } from "@/components/admin/ui";
import { listCustomers } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const customers = await listCustomers(query);

  return (
    <>
      <PageTitle
        title="Customers"
        action={
          <Link href="/admin/customers/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-surface hover:bg-ink/85">
            <UserPlus className="size-4" aria-hidden /> Register a customer
          </Link>
        }
      >
        Everyone with online banking, newest first.
      </PageTitle>

      <AdminPanel className="p-0 sm:p-0">
        <form className="border-b border-line p-4" role="search">
          <label htmlFor="customer-search" className="sr-only">
            Search customers
          </label>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate" aria-hidden />
            <input
              id="customer-search"
              name="q"
              defaultValue={query}
              placeholder="Search by name, login ID or email"
              className="h-11 w-full rounded-xl border border-input bg-canvas pr-4 pl-10 text-[0.95rem] text-ink outline-none placeholder:text-slate focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </div>
        </form>

        {customers.length === 0 ? (
          <p className="px-6 py-14 text-center text-slate">
            {query ? `No customers match “${query}”.` : "No customers yet. Register your first one to get started."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate">
                <tr className="border-b border-line">
                  <th scope="col" className="px-5 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-5 py-3 font-medium">Login ID</th>
                  <th scope="col" className="px-5 py-3 font-medium">Accounts</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Total balance</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-canvas">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/customers/${c.id}`} className="font-semibold text-ink hover:text-amber-ink">
                        {c.first_name} {c.last_name}
                      </Link>
                      <span className="block text-xs text-slate">{c.email}</span>
                    </td>
                    <td className="px-5 py-3.5 text-ink">{c.user_id}</td>
                    <td className="px-5 py-3.5 text-slate">{c.accounts.length ? c.accounts.map((a) => a.name.split(" ")[0]).join(", ") : "None"}</td>
                    <td className="figures px-5 py-3.5 text-right font-semibold text-ink">{money(c.accounts.reduce((s, a) => s + a.balance, 0))}</td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={c.status} mustChange={c.must_change_password} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </>
  );
}
