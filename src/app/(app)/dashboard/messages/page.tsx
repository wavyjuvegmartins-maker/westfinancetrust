import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PushToggle } from "@/components/app/push-toggle";
import { ChatThread } from "@/components/chat/thread";
import { getSessionUser } from "@/lib/auth/session";
import { loadThread } from "@/lib/messages/queries";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Messages" };

// Secure messages with the bank's staff. The layout has already checked this is a customer.
export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const messages = await loadThread(user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 lg:pt-2">
        <h1 className="font-heading text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Messages</h1>
        <p className="mt-1 text-sm text-slate sm:text-base">
          Secure messages with our team. We reply during opening hours. Urgent, like a lost card? Call {site.phone}.
        </p>
      </div>
      <PushToggle onlyWhenOff className="mb-5 rounded-[1.25rem] bg-panel p-4 ring-1 ring-line/70 dark:ring-white/[0.06]" />
      <ChatThread initial={messages} customerId={user.id} viewer="customer" />
    </div>
  );
}
