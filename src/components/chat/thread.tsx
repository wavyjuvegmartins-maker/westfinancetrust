"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Check, CheckCheck, Loader2, ShieldCheck } from "lucide-react";
import { markConversationRead, sendMessage } from "@/lib/messages/actions";
import type { ChatMessage } from "@/lib/messages/queries";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

type Viewer = "customer" | "staff";

type Pending = { id: string; body: string; failed?: string };

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/**
 * One secure conversation between a customer and the bank's staff. New messages
 * arrive live; opening the thread marks the other side's messages as read.
 */
export function ChatThread({
  initial,
  customerId,
  viewer,
  customerName,
}: {
  initial: ChatMessage[];
  customerId: string;
  viewer: Viewer;
  /** Shown on the customer's bubbles in the staff view. */
  customerName?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextPendingId = useRef(0);
  const mine = (m: ChatMessage) => (viewer === "staff" ? m.fromStaff : !m.fromStaff);

  // Read receipts and badges: mark the other side's messages read now and whenever one arrives.
  const unreadFromOtherSide = messages.some((m) => !mine(m) && !m.readAt);
  useEffect(() => {
    if (!unreadFromOtherSide) return;
    markConversationRead(viewer === "staff" ? customerId : undefined).then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when unread messages appear
  }, [unreadFromOtherSide, customerId, viewer]);

  // Live: new messages from the other side (and our own from another device).
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`chat-${customerId}-${viewer}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `customer_id=eq.${customerId}` },
          (payload: { new: Record<string, unknown> }) => {
            const r = payload.new as { id: string; from_staff: boolean; body: string; created_at: string; read_at: string | null };
            setMessages((list) =>
              list.some((m) => m.id === r.id)
                ? list
                : [...list, { id: r.id, fromStaff: r.from_staff, body: r.body, createdAt: r.created_at, readAt: r.read_at, staffName: null }],
            );
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter: `customer_id=eq.${customerId}` },
          (payload: { new: Record<string, unknown> }) => {
            const r = payload.new as { id: string; read_at: string | null };
            setMessages((list) => list.map((m) => (m.id === r.id ? { ...m, readAt: r.read_at } : m)));
          },
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [customerId, viewer]);

  // Keep the newest message in view.
  const count = messages.length + pending.length;
  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count]);

  const send = async (body: string, retryId?: string) => {
    const text = body.trim();
    if (!text) return;
    const id = retryId ?? `pending-${++nextPendingId.current}`;
    setPending((list) => (retryId ? list.map((p) => (p.id === id ? { id, body: text } : p)) : [...list, { id, body: text }]));
    if (!retryId) setDraft("");
    const result = await sendMessage({ body: text, customerId: viewer === "staff" ? customerId : undefined });
    if (result.ok) {
      setPending((list) => list.filter((p) => p.id !== id));
      setMessages((list) => (list.some((m) => m.id === result.message.id) ? list : [...list, result.message]));
    } else {
      setPending((list) => list.map((p) => (p.id === id ? { ...p, failed: result.error } : p)));
    }
  };

  // Group by day for the date dividers.
  const groups: { day: string; items: ChatMessage[] }[] = [];
  for (const m of messages) {
    const day = dayLabel(m.createdAt);
    if (groups.at(-1)?.day !== day) groups.push({ day, items: [] });
    groups.at(-1)!.items.push(m);
  }
  const lastMine = [...messages].reverse().find(mine);

  return (
    <div className="flex flex-col">
      <div className="min-h-[45vh] space-y-5 pb-4" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && pending.length === 0 && <EmptyState viewer={viewer} customerName={customerName} />}

        {groups.map((g) => (
          <section key={g.day} aria-label={g.day} className="space-y-2">
            <p className="py-1 text-center text-xs font-semibold text-slate">{g.day}</p>
            {g.items.map((m) => (
              <Bubble
                key={m.id}
                mine={mine(m)}
                author={mine(m) ? undefined : m.fromStaff ? `${m.staffName ? `${m.staffName}, ` : ""}${site.name}` : customerName}
                body={m.body}
                meta={timeLabel(m.createdAt)}
                receipt={m === lastMine ? (m.readAt ? "read" : "sent") : undefined}
              />
            ))}
          </section>
        ))}

        <AnimatePresence initial={false}>
          {pending.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Bubble mine body={p.body} meta={p.failed ? undefined : "Sending"} sending={!p.failed} />
              {p.failed && (
                <p className="mt-1 text-right text-xs text-negative">
                  {p.failed}{" "}
                  <button type="button" className="font-semibold underline underline-offset-2" onClick={() => send(p.body, p.id)}>
                    Try again
                  </button>
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-10 lg:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
          inputRef.current?.focus();
        }}
      >
        <div className="flex items-end gap-2 rounded-[1.5rem] bg-panel p-2 shadow-[0_12px_32px_-16px_rgb(15_27_51/0.4)] ring-1 ring-line dark:ring-white/10">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends on a keyboard; Shift+Enter adds a line. Phones use the send button.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={viewer === "staff" ? "Reply to the customer" : "Write a message"}
            className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-ink outline-none placeholder:text-slate"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber text-deep transition-colors hover:bg-amber-strong disabled:bg-line disabled:text-slate"
          >
            <ArrowUp className="size-5" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({
  mine,
  author,
  body,
  meta,
  receipt,
  sending,
}: {
  mine: boolean;
  author?: string;
  body: string;
  meta?: string;
  receipt?: "sent" | "read";
  sending?: boolean;
}) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] sm:max-w-[70%]", mine && "text-right")}>
        {author && <p className="mb-1 px-1 text-xs font-semibold text-slate">{author}</p>}
        <p
          className={cn(
            "inline-block rounded-[1.25rem] px-4 py-2.5 text-left text-[0.95rem] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]",
            mine ? "rounded-br-md bg-deep text-white dark:bg-amber dark:text-deep" : "rounded-bl-md bg-panel text-ink ring-1 ring-line/70 dark:ring-white/[0.06]",
            sending && "opacity-70",
          )}
        >
          {body}
        </p>
        {(meta || receipt) && (
          <p className={cn("mt-1 flex items-center gap-1 px-1 text-[0.7rem] text-slate", mine && "justify-end")}>
            {sending && <Loader2 className="size-3 animate-spin" aria-hidden />}
            {meta}
            {receipt === "sent" && <Check className="size-3.5" aria-label="Sent" />}
            {receipt === "read" && <CheckCheck className="size-3.5 text-amber-ink" aria-label="Read" />}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ viewer, customerName }: { viewer: Viewer; customerName?: string }) {
  return (
    <div className="mx-auto max-w-sm rounded-[1.5rem] bg-panel px-6 py-8 text-center ring-1 ring-line/70 dark:ring-white/[0.06]">
      <ShieldCheck className="mx-auto size-8 text-amber-ink" aria-hidden />
      {viewer === "customer" ? (
        <>
          <p className="mt-3 font-semibold text-ink">Message us securely</p>
          <p className="mt-1 text-sm leading-relaxed text-slate">
            Ask about your accounts, cards or payments. We reply during opening hours, and you’ll get a notification when we do.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate">We’ll never ask for your password or a one-time code here.</p>
        </>
      ) : (
        <>
          <p className="mt-3 font-semibold text-ink">No messages yet</p>
          <p className="mt-1 text-sm text-slate">Start the conversation with {customerName ?? "this customer"}. They’ll be notified.</p>
        </>
      )}
    </div>
  );
}
