import type { Metadata } from "next";
import { MarkHandledButton } from "@/components/admin/customer-tools";
import { AdminPanel, PageTitle, Pill, shortDate } from "@/components/admin/ui";
import { listMessages } from "@/lib/admin/queries";
import { contactTopics } from "@/lib/schemas";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const messages = await listMessages();
  const topic = (value: string) => contactTopics.find((t) => t.value === value)?.label ?? value;

  return (
    <>
      <PageTitle title="Website messages">Sent through the contact form on the public website.</PageTitle>
      {messages.length === 0 ? (
        <AdminPanel>
          <p className="py-8 text-center text-slate">No messages yet.</p>
        </AdminPanel>
      ) : (
        <ul className="grid gap-4">
          {messages.map((m) => (
            <li key={m.id}>
              <AdminPanel className={m.handled_at ? "opacity-70" : ""}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {m.name} <span className="font-normal text-slate">({m.email}{m.phone ? `, ${m.phone}` : ""})</span>
                    </p>
                    <p className="mt-0.5 text-sm text-slate">
                      {topic(m.topic)}, {shortDate(m.created_at)}
                    </p>
                  </div>
                  {m.handled_at ? <Pill className="bg-positive/10 text-positive">Handled</Pill> : <MarkHandledButton id={m.id} />}
                </div>
                <p className="mt-3 whitespace-pre-line text-ink/90">{m.message}</p>
              </AdminPanel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
