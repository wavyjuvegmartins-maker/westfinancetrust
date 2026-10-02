import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AdminPanel, PageTitle, PersonBadge } from "@/components/admin/ui";
import { listConversations } from "@/lib/messages/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inbox" };

const when = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Every customer conversation, most recent first. Any member of staff can reply.
export default async function InboxPage() {
  const conversations = await listConversations();
  const waiting = conversations.filter((c) => c.unread > 0).length;

  return (
    <>
      <PageTitle title="Inbox">
        {waiting ? `${waiting} ${waiting === 1 ? "customer is" : "customers are"} waiting for a reply.` : "Secure messages from customers in online banking."}
      </PageTitle>
      <AdminPanel className="p-0 sm:p-0">
        {conversations.length === 0 ? (
          <p className="px-6 py-14 text-center text-slate">
            No messages yet. Customers write from Messages in online banking, or start a conversation from a customer’s page.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {conversations.map((c) => {
              const [first = "", last = ""] = c.name.split(" ");
              return (
                <li key={c.customerId}>
                  <Link href={`/admin/inbox/${c.customerId}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-canvas sm:px-5">
                    <PersonBadge first={first} last={last} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn("truncate text-ink", c.unread ? "font-bold" : "font-semibold")}>{c.name || "Former customer"}</span>
                        <span className={cn("shrink-0 text-xs", c.unread ? "font-semibold text-amber-ink" : "text-slate")}>{when(c.lastAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-3">
                        <span className={cn("truncate text-sm", c.unread ? "text-ink" : "text-slate")}>
                          {c.lastFromStaff && "You: "}
                          {c.lastBody}
                        </span>
                        {c.unread > 0 && (
                          <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-amber px-1.5 text-xs leading-5 font-bold text-deep">
                            {c.unread}
                            <span className="sr-only"> unread</span>
                          </span>
                        )}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-slate" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>
    </>
  );
}
