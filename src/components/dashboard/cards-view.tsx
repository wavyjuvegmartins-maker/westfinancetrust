"use client";

import { useState } from "react";
import { CreditCard, KeyRound, Loader2, RefreshCcw, Smartphone, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { TxnList } from "@/components/dashboard/activity";
import { BankCard } from "@/components/dashboard/bank-card";
import { cardSpentToday, monthStart } from "@/components/dashboard/selectors";
import { useBank } from "@/components/dashboard/store";
import { Money, Panel, PanelHeader } from "@/components/dashboard/ui";
import { useUser } from "@/components/dashboard/user";
import { CardControls } from "@/components/dashboard/widgets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fullName } from "@/lib/auth/types";
import { formatMoney } from "@/lib/rates";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const reasons = [
  { id: "lost", label: "It’s lost" },
  { id: "stolen", label: "It was stolen" },
  { id: "damaged", label: "It’s damaged" },
] as const;

export function CardsView() {
  const { state, dispatch, run } = useBank();
  const user = useUser();
  const { card } = state;
  const [flipped, setFlipped] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number]["id"]>("lost");
  // The slider moves locally; the new limit is saved once you let go.
  const [draftLimit, setDraftLimit] = useState<number | null>(null);

  const header = (
    <div className="pt-2">
      <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink">Cards</h1>
      <p className="mt-1 text-slate">Freeze, limit and control your debit card. Changes apply instantly.</p>
    </div>
  );

  if (!card) {
    return (
      <div className="space-y-5">
        {header}
        <Panel className="flex flex-col items-center px-6 py-16 text-center">
          <CreditCard className="size-10 text-slate" aria-hidden />
          <h2 className="mt-4 font-heading text-xl font-semibold text-ink">You don’t have a debit card yet</h2>
          <p className="mt-2 max-w-md text-slate">
            Debit cards come with a checking account. Visit your branch or call {site.phone} and we’ll issue one.
          </p>
        </Panel>
      </div>
    );
  }

  const limit = draftLimit ?? card.dailyLimit;
  const spent = cardSpentToday(state);
  const cardTxns = state.txns.filter((t) => t.method === "card" && new Date(t.date) >= monthStart(0)).slice(0, 12);

  const toggleFreeze = () => {
    dispatch({ type: "card", patch: { frozen: !card.frozen } });
    toast(card.frozen ? "Card unfrozen" : "Card frozen", {
      description: card.frozen ? "Your card works again." : "New card payments will be declined until you unfreeze it.",
    });
  };

  const commitLimit = async () => {
    if (draftLimit === null || draftLimit === card.dailyLimit) return setDraftLimit(null);
    const result = await run({ type: "card", patch: { dailyLimit: draftLimit } });
    setDraftLimit(null);
    if (result.ok) toast.success("Limit updated", { description: `Your card can now spend up to ${formatMoney(draftLimit)} a day.` });
  };

  const replace = async () => {
    setReplacing(true);
    const result = await run({ type: "replaceCard", reason });
    setReplacing(false);
    if (!result.ok) return;
    setReplaceOpen(false);
    setFlipped(false);
    toast.success("Replacement ordered", { description: "Your old card is cancelled. The new one arrives in 3 to 5 business days." });
  };

  return (
    <div className="space-y-5">
      {header}

      <div className="grid gap-5 lg:grid-cols-12">
        <section aria-label="Your debit card" className="relative overflow-hidden rounded-[1.75rem] bg-deep p-6 text-white sm:p-10 lg:col-span-7">
          <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-amber/10 blur-3xl" />
          <BankCard card={card} holder={fullName(user)} flipped={flipped} className="relative mx-auto max-w-md" />

          <div className="relative mx-auto mt-8 max-w-md">
            <dl className="mb-5 grid grid-cols-3 gap-3 rounded-2xl bg-white/[0.06] p-4 text-sm ring-1 ring-white/10">
              <div>
                <dt className="text-white/55">Card ending</dt>
                <dd className="figures font-semibold">{card.last4}</dd>
              </div>
              <div>
                <dt className="text-white/55">Expires</dt>
                <dd className="figures font-semibold">{card.expiry}</dd>
              </div>
              <div>
                <dt className="text-white/55">Status</dt>
                <dd className="font-semibold">{card.frozen ? "Frozen" : "Active"}</dd>
              </div>
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.08] px-4 py-3.5 text-sm font-semibold ring-1 ring-white/10 transition-colors hover:bg-white/[0.14]"
              >
                <RefreshCcw className="size-4" aria-hidden />
                {flipped ? "Show the front" : "Turn the card over"}
              </button>
              <button
                type="button"
                onClick={toggleFreeze}
                aria-pressed={card.frozen}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold ring-1 transition-colors",
                  card.frozen ? "bg-[#bcd7f5] text-deep ring-[#bcd7f5]" : "bg-white/[0.08] ring-white/10 hover:bg-white/[0.14]",
                )}
              >
                <Snowflake className="size-4" aria-hidden />
                {card.frozen ? "Unfreeze card" : "Freeze card"}
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-white/55">
              For your security, the full card number and code are only printed on the card itself.
            </p>
          </div>
        </section>

        <div className="grid content-start gap-5 lg:col-span-5">
          <Panel aria-labelledby="controls-title">
            <PanelHeader id="controls-title" title="What your card can do" />
            <CardControls />
          </Panel>

          <Panel aria-labelledby="limit-title">
            <PanelHeader id="limit-title" title="Daily spending limit">
              The most your card can spend in one day
            </PanelHeader>
            <p className="font-heading text-[2rem] leading-none font-semibold tracking-[-0.03em] text-ink">
              <Money value={limit} always />
            </p>
            <label htmlFor="daily-limit" className="sr-only">
              Daily spending limit
            </label>
            <input
              id="daily-limit"
              type="range"
              min={100}
              max={5000}
              step={100}
              value={limit}
              onChange={(e) => setDraftLimit(Number(e.target.value))}
              onPointerUp={commitLimit}
              onKeyUp={commitLimit}
              onBlur={commitLimit}
              aria-valuetext={formatMoney(limit)}
              className="mt-4 w-full cursor-pointer accent-amber-strong"
            />
            <div className="figures mt-1 flex justify-between text-xs text-slate">
              <span>$100</span>
              <span>$5,000</span>
            </div>
            <p className="mt-4 text-sm text-slate">
              <Money value={spent} className="font-semibold text-ink" /> spent today,{" "}
              <Money value={Math.max(limit - spent, 0)} always className="font-semibold text-ink" /> left.
            </p>
          </Panel>

          <Panel aria-labelledby="card-actions-title">
            <PanelHeader id="card-actions-title" title="More options" />
            <div className="grid gap-2">
              <ActionRow
                icon={Smartphone}
                title="Add to your phone’s wallet"
                body="Coming soon"
                onClick={() => toast("Mobile wallets are coming soon", { description: "We’ll let you know when you can add your card to your phone." })}
              />
              <ActionRow icon={RefreshCcw} title="Replace your card" body="Lost, stolen or damaged" onClick={() => setReplaceOpen(true)} />
              <ActionRow
                icon={KeyRound}
                title="Change your PIN"
                body="At any of our ATMs or branches"
                onClick={() => toast("Change your PIN in person", { description: `For your security, PINs are changed at our ATMs or branches. Questions? Call ${site.phone}.` })}
              />
            </div>
          </Panel>
        </div>
      </div>

      <Panel aria-labelledby="card-activity-title" className="px-3 sm:px-4">
        <div className="px-2">
          <PanelHeader id="card-activity-title" title="Card payments this month" />
        </div>
        {cardTxns.length ? (
          <TxnList txns={cardTxns} />
        ) : (
          <p className="mx-2 rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">No card payments this month.</p>
        )}
      </Panel>

      <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Replace your card</DialogTitle>
            <DialogDescription>
              Your card ending {card.last4} will be cancelled straight away and a new one sent to your address.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold text-ink">What happened?</legend>
            {reasons.map((r) => (
              <label key={r.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 ring-1 transition-colors", reason === r.id ? "bg-amber-soft ring-amber" : "ring-line")}>
                <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-amber-strong" />
                <span className="text-sm font-medium text-ink">{r.label}</span>
              </label>
            ))}
          </fieldset>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline-ink" size="md" onClick={() => setReplaceOpen(false)}>
              Keep my card
            </Button>
            <Button type="button" variant="ink" size="md" onClick={replace} disabled={replacing}>
              {replacing && <Loader2 className="animate-spin" aria-hidden />}
              Cancel and replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionRow({ icon: Icon, title, body, onClick }: { icon: typeof CreditCard; title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3 text-left transition-colors hover:bg-paper">
      <span className="flex size-9 items-center justify-center rounded-xl bg-panel text-ink ring-1 ring-line">
        <Icon className="size-4" aria-hidden />
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="text-xs text-slate">{body}</span>
      </span>
    </button>
  );
}
