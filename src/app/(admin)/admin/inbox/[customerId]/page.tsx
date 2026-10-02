import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { PersonBadge, StatusPill } from "@/components/admin/ui";
import { ChatThread } from "@/components/chat/thread";
import { loadThread } from "@/lib/messages/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Conversation" };

// One customer's conversation, for staff. The admin layout has already checked the viewer is staff.
export default async function ConversationPage({ params }: PageProps<"/admin/inbox/[customerId]">) {
  const { customerId } = await params;
  const { data: customer } = await createSupabaseAdminClient()
    .from("profiles")
    .select("id, first_name, last_name, user_id, status, must_change_password")
    .eq("id", customerId)
    .eq("role", "customer")
    .maybeSingle<{ id: string; first_name: string; last_name: string; user_id: string; status: string; must_change_password: boolean }>();
  if (!customer) notFound();
  const messages = await loadThread(customerId);
  const name = `${customer.first_name} ${customer.last_name}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/inbox" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Inbox
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PersonBadge first={customer.first_name} last={customer.last_name} className="size-11" />
          <div className="min-w-0">
            <h1 className="truncate font-heading text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{name}</h1>
            <p className="flex items-center gap-2 text-sm text-slate">
              {customer.user_id} <StatusPill status={customer.status} mustChange={customer.must_change_password} />
            </p>
          </div>
        </div>
        <Link
          href={`/admin/customers/${customer.id}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-panel px-3.5 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-paper"
        >
          <UserRound className="size-4" aria-hidden /> Customer details
        </Link>
      </div>
      <p className="mb-5 rounded-2xl bg-amber-soft px-4 py-3 text-sm text-ink">
        Never ask for a password or one-time code here. For changes to personal details, ask the customer to call or visit.
      </p>
      <ChatThread initial={messages} customerId={customer.id} viewer="staff" customerName={customer.first_name} />
    </div>
  );
}
