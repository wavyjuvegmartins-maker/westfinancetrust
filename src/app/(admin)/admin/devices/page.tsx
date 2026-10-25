import type { Metadata } from "next";
import Link from "next/link";
import { DeviceDecisionButtons } from "@/components/admin/device-tools";
import { AdminPanel, PageTitle, Pill, shortDate } from "@/components/admin/ui";
import { getSessionUser } from "@/lib/auth/session";
import { listDeviceQueue, type AdminDeviceRequest } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Device approvals" };

const outcome: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-positive/10 text-positive" },
  used: { label: "Approved, signed in", className: "bg-positive/10 text-positive" },
  denied: { label: "Denied", className: "bg-negative/10 text-negative" },
};

function RequestLine({ r, children }: { r: AdminDeviceRequest; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 py-3.5">
      <span className="min-w-0">
        {r.customer ? (
          <Link href={`/admin/customers/${r.customer.id}`} className="font-semibold text-ink hover:underline">
            {r.customer.first_name} {r.customer.last_name}
          </Link>
        ) : (
          <span className="font-semibold text-ink">Customer</span>
        )}
        {r.customer && <span className="ml-2 text-sm text-slate">{r.customer.user_id}</span>}
        <span className="block text-sm text-ink">{r.device}</span>
        <span className="block text-sm text-slate">
          IP <span className="font-mono text-ink">{r.ip ?? "unknown"}</span>
        </span>
        {r.user_agent && <span className="block max-w-md truncate text-xs text-slate" title={r.user_agent}>{r.user_agent}</span>}
        <span className="block text-xs text-slate">
          Asked {shortDate(r.created_at)}
          {r.decided_at && r.decider ? `, decided ${shortDate(r.decided_at)} by ${r.decider.first_name} ${r.decider.last_name}` : ""}
        </span>
        {r.deny_reason && <span className="block text-xs text-negative">{r.deny_reason}</span>}
      </span>
      {children}
    </li>
  );
}

export default async function DevicesPage() {
  const user = await getSessionUser();
  if (user?.role !== "admin") {
    return (
      <>
        <PageTitle title="Device approvals" />
        <p className="rounded-2xl bg-amber-soft px-4 py-3 text-sm text-amber-ink">Only an admin can see and approve new devices.</p>
      </>
    );
  }
  const { pending, recent } = await listDeviceQueue();

  return (
    <>
      <PageTitle title="Device approvals">
        Customers signing in from a new device and a new IP address wait here. Call them on the number on file before approving.
      </PageTitle>
      <div className="grid gap-4 lg:gap-5">
        <AdminPanel aria-labelledby="devices-pending-title">
          <h2 id="devices-pending-title" className="mb-1 font-heading text-lg font-semibold text-ink">
            Waiting now <span className="text-slate">({pending.length})</span>
          </h2>
          <p className="mb-2 text-sm text-slate">Their screen is waiting. A request stops waiting after 12 hours.</p>
          {pending.length ? (
            <ul className="divide-y divide-line">
              {pending.map((r) => (
                <RequestLine key={r.id} r={r}>
                  <DeviceDecisionButtons
                    request={{
                      id: r.id,
                      device: r.device,
                      ip: r.ip,
                      customerName: r.customer ? r.customer.first_name : "the customer",
                      phone: r.customer?.phone ?? null,
                    }}
                  />
                </RequestLine>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">No one is waiting.</p>
          )}
        </AdminPanel>

        <AdminPanel aria-labelledby="devices-recent-title">
          <h2 id="devices-recent-title" className="mb-2 font-heading text-lg font-semibold text-ink">Recently decided</h2>
          {recent.length ? (
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <RequestLine key={r.id} r={r}>
                  <Pill className={outcome[r.status]?.className ?? "bg-line text-slate"}>{outcome[r.status]?.label ?? r.status}</Pill>
                </RequestLine>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">Nothing yet.</p>
          )}
        </AdminPanel>
      </div>
    </>
  );
}
