"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, CircleDashed, Flag, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { categoryMeta, isSpend, spendCategories, type SpendCategory, type Txn } from "@/components/dashboard/data";
import { dayLabel, groupByDay, timeLabel } from "@/components/dashboard/selectors";
import { useBank } from "@/components/dashboard/store";
import { CategoryIcon, Money, Panel, PanelHeader, Pill } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const methodLabel: Record<Txn["method"], string> = {
  card: "Debit card",
  transfer: "Transfer",
  deposit: "Deposit",
  cash: "Cash withdrawal",
  bill: "Bill payment",
  interest: "Interest",
  p2p: "Payment to a person",
  other: "Bank adjustment",
};

export function TxnRow({ txn, onSelect }: { txn: Txn; onSelect: (t: Txn) => void }) {
  const incoming = txn.amount > 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(txn)}
      className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-canvas"
    >
      <CategoryIcon category={txn.category} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.95rem] font-semibold text-ink">{txn.merchant}</span>
        <span className="flex items-center gap-2 text-xs text-slate">
          <span className="truncate">{txn.note ?? categoryMeta[txn.category].label}</span>
          {txn.status === "pending" && (
            <Pill className="bg-amber-soft text-amber-ink">
              <CircleDashed className="size-3 animate-spin [animation-duration:3s]" aria-hidden /> Pending
            </Pill>
          )}
        </span>
      </span>
      <span className="text-right">
        <Money
          value={txn.amount}
          sign
          className={cn("block text-[0.95rem] font-semibold", incoming ? "text-positive" : "text-ink", txn.status === "pending" && "opacity-70")}
        />
        <span className="text-xs text-slate">{timeLabel(txn.date)}</span>
      </span>
    </button>
  );
}

/** Transactions grouped by day, with the detail sheet. New ones slide in at the top. */
export function TxnList({ txns, showDayTotals = false }: { txns: Txn[]; showDayTotals?: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const groups = groupByDay(txns);

  return (
    <>
      <div className="space-y-4">
        {groups.map((g) => (
          <section key={g.day.toISOString()} aria-label={dayLabel(g.day)}>
            <div className="sticky top-16 z-10 -mx-1 flex items-center justify-between bg-panel/90 px-3 py-1.5 backdrop-blur lg:top-20">
              <h3 className="text-xs font-semibold text-slate">{dayLabel(g.day)}</h3>
              {showDayTotals && <Money value={g.net} sign className="text-xs font-semibold text-slate" />}
            </div>
            <ul>
              <AnimatePresence initial={false}>
                {g.items.map((t) => (
                  <motion.li
                    key={t.id}
                    layout
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <TxnRow txn={t} onSelect={(x) => setSelectedId(x.id)} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </section>
        ))}
      </div>
      <TxnDetailSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}

export function RecentActivity({ className }: { className?: string }) {
  const { state } = useBank();
  return (
    <Panel className={className} aria-labelledby="recent-title">
      <PanelHeader
        id="recent-title"
        title="Recent activity"
        action={
          <Link href="/dashboard/activity" className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-amber-ink">
            See all <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      >
        Tap a payment for details
      </PanelHeader>
      {state.txns.length ? (
        <TxnList txns={state.txns.slice(0, 7)} />
      ) : (
        <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">
          No payments yet. Deposits and payments will appear here as soon as they happen.
        </p>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------ detail sheet */

function TxnDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { state, dispatch } = useBank();
  const txn = id ? state.txns.find((t) => t.id === id) : null;
  const account = txn ? state.accounts.find((a) => a.id === txn.account) : null;

  return (
    <Sheet open={!!txn} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto bg-panel p-0 sm:max-w-md">
        {txn && account && (
          <>
            <SheetHeader className="items-center px-6 pt-10 pb-6 text-center">
              <CategoryIcon category={txn.category} className="size-16 rounded-[1.25rem] [&_svg]:size-7" />
              <SheetTitle className="mt-4 font-heading text-xl font-semibold tracking-[-0.02em]">{txn.merchant}</SheetTitle>
              <SheetDescription>
                {new Date(txn.date).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </SheetDescription>
              <p className={cn("mt-3 font-heading text-[2.4rem] leading-none font-semibold tracking-[-0.03em]", txn.amount > 0 ? "text-positive" : "text-ink")}>
                <Money value={txn.amount} sign always />
              </p>
            </SheetHeader>

            <div className="space-y-6 px-6 pb-10">
              {/* status timeline */}
              <ol className="rounded-2xl bg-canvas p-4">
                <TimelineStep done title={txn.method === "card" ? "Authorized" : "Started"} detail={timeLabel(txn.date)} />
                <TimelineStep
                  done={txn.status === "posted"}
                  last
                  title={txn.status === "posted" ? "Completed" : "Pending"}
                  detail={txn.status === "posted" ? "The money has settled." : "Card payments usually settle within 1 to 3 days."}
                />
              </ol>

              <dl className="divide-y divide-line text-sm">
                <DetailRow term="Account" detail={`${account.name} ••${account.mask}`} />
                <DetailRow term="Method" detail={txn.method === "card" && state.card ? `${methodLabel.card} ••${state.card.last4}` : methodLabel[txn.method]} />
                <DetailRow term="Reference" detail={txn.reference} />
              </dl>

              {isSpend(txn.category) && (
                <div>
                  <label htmlFor="txn-category" className="mb-2 block text-sm font-semibold text-ink">
                    Category
                  </label>
                  <select
                    id="txn-category"
                    value={txn.category}
                    onChange={(e) => {
                      dispatch({ type: "updateTxn", id: txn.id, patch: { category: e.target.value as SpendCategory } });
                      toast.success("Category updated", { description: "Your spending breakdown now reflects it." });
                    }}
                    className="h-11 w-full rounded-xl border border-input bg-panel px-3.5 text-[0.95rem] text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    {spendCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <NoteField key={txn.id} txn={txn} />

              <div className="flex flex-col gap-2">
                {txn.method === "card" && state.card && !state.card.frozen && (
                  <Button
                    type="button"
                    variant="outline-ink"
                    size="xl"
                    onClick={() => {
                      dispatch({ type: "card", patch: { frozen: true } });
                      toast("Card frozen", { description: "New card payments will be declined until you unfreeze it." });
                    }}
                  >
                    <Snowflake aria-hidden /> Don’t recognise it? Freeze card
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="xl"
                  className="text-slate"
                  onClick={() => toast("Call us about this payment", { description: `Ring ${site.phone} and quote reference ${txn.reference}. We’ll look into it straight away.`, duration: 10000 })}
                >
                  <Flag aria-hidden /> Report a problem
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NoteField({ txn }: { txn: Txn }) {
  const { dispatch } = useBank();
  const [note, setNote] = useState(txn.note ?? "");
  const dirty = note.trim() !== (txn.note ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        dispatch({ type: "updateTxn", id: txn.id, patch: { note: note.trim() || undefined } });
        toast.success(note.trim() ? "Note saved" : "Note removed");
      }}
    >
      <label htmlFor="txn-note" className="mb-2 block text-sm font-semibold text-ink">
        Note
      </label>
      <div className="flex gap-2">
        <input
          id="txn-note"
          value={note}
          maxLength={60}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note to remember this by"
          className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-panel px-3.5 text-[0.95rem] text-ink outline-none placeholder:text-slate/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <Button type="submit" variant="ink" size="md" className="h-11" disabled={!dirty}>
          Save
        </Button>
      </div>
    </form>
  );
}

function TimelineStep({ done, last, title, detail }: { done: boolean; last?: boolean; title: string; detail: string }) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span className="absolute top-6 left-[11px] h-[calc(100%-1.25rem)] w-px bg-line" aria-hidden />}
      <span
        className={cn(
          "relative flex size-6 shrink-0 items-center justify-center rounded-full",
          done ? "bg-positive text-white" : "bg-amber-soft text-amber-ink ring-2 ring-amber/40",
        )}
      >
        {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <CircleDashed className="size-3.5 animate-spin [animation-duration:3s]" aria-hidden />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="text-xs text-slate">{detail}</span>
      </span>
    </li>
  );
}

function DetailRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-slate">{term}</dt>
      <dd className="text-right font-medium text-ink">{detail}</dd>
    </div>
  );
}
