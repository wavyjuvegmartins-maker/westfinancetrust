"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, CircleAlert, CreditCard, HandCoins, Pencil, Plus, Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BankCard } from "@/components/dashboard/bank-card";
import { useMoveMoney } from "@/components/dashboard/move-money";
import { cardSpentToday, interestPerSecond, interestThisMonth, upcomingBills } from "@/components/dashboard/selectors";
import { useBank } from "@/components/dashboard/store";
import { Money, Panel, PanelHeader, Pill } from "@/components/dashboard/ui";
import { Switch } from "@/components/ui/switch";
import { primaryChecking, type Bill, type Goal } from "@/components/dashboard/data";
import { BillDialog, GoalDialog } from "@/components/dashboard/manage";
import { useUser } from "@/components/dashboard/user";
import { fullName } from "@/lib/auth/types";
import { formatMoney, formatRate, loanProducts, lowestLoanApr } from "@/lib/rates";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------- card */

export function CardWidget({ className }: { className?: string }) {
  const { state, dispatch } = useBank();
  const user = useUser();
  const { card } = state;
  const spent = cardSpentToday(state);

  if (!card) {
    return (
      <Panel className={cn("flex flex-col", className)} aria-labelledby="card-title">
        <PanelHeader id="card-title" title="Your card" />
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-canvas px-6 py-10 text-center">
          <CreditCard className="size-8 text-slate" aria-hidden />
          <p className="mt-3 font-semibold text-ink">No debit card yet</p>
          <p className="mt-1 text-sm text-slate">Cards are issued with a checking account. Ask at your branch or call us.</p>
        </div>
      </Panel>
    );
  }
  const used = Math.min(spent / card.dailyLimit, 1);

  return (
    <Panel className={cn("flex flex-col", className)} aria-labelledby="card-title">
      <PanelHeader
        id="card-title"
        title="Your card"
        action={
          <Link href="/dashboard/cards" className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-amber-ink">
            Manage <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      >
        Debit card ending {card.last4}
      </PanelHeader>

      <BankCard card={card} holder={fullName(user)} className="mx-auto w-full max-w-[22rem]" />

      <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-canvas px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">{card.frozen ? "Card frozen" : "Card active"}</p>
          <p className="text-xs text-slate">{card.frozen ? "Payments will be declined" : "Freeze it if you can’t find it"}</p>
        </div>
        <Switch
          checked={card.frozen}
          onCheckedChange={(frozen) => {
            dispatch({ type: "card", patch: { frozen } });
            toast(frozen ? "Card frozen" : "Card unfrozen", {
              description: frozen ? "New card payments will be declined until you unfreeze it." : "Your card works again.",
            });
          }}
          aria-label="Freeze card"
          className="data-checked:bg-[#5b9be0]"
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate">Spent today</span>
          <span className="text-slate">
            <Money value={spent} className="font-semibold text-ink" /> of <Money value={card.dailyLimit} always />
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber/20">
          <motion.div className="h-full rounded-full bg-amber" initial={{ width: 0 }} animate={{ width: `${used * 100}%` }} transition={{ duration: 0.8, ease }} />
        </div>
      </div>

      <div className="mt-4 border-t border-line">
        <CardControls compact />
      </div>
    </Panel>
  );
}

const cardControls = [
  { key: "online", label: "Online payments", hint: "Websites, apps and subscriptions" },
  { key: "contactless", label: "Contactless", hint: "Tap to pay in stores" },
  { key: "atm", label: "ATM withdrawals", hint: "Cash from any ATM" },
  { key: "abroad", label: "Use abroad", hint: "Payments and cash outside the US" },
] as const;

/** Switches for what the card can be used for. */
export function CardControls({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useBank();
  const card = state.card;
  if (!card) return null;
  const list = compact ? cardControls.filter((c) => c.key !== "atm") : cardControls;
  return (
    <ul className="divide-y divide-line">
      {list.map((c) => (
        <li key={c.key} className={cn("flex items-center justify-between gap-4", compact ? "py-2.5" : "py-4")}>
          <span>
            <span className="block text-sm font-semibold text-ink">{c.label}</span>
            {!compact && <span className="text-xs text-slate">{c.hint}</span>}
          </span>
          <Switch
            checked={card[c.key]}
            onCheckedChange={(on) => {
              dispatch({ type: "card", patch: { [c.key]: on } });
              toast(`${c.label} ${on ? "on" : "off"}`, {
                description: on ? "Your card can be used for this again." : "These payments will be declined until you switch this back on.",
              });
            }}
            aria-label={c.label}
            className="data-checked:bg-amber"
          />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ goals */

function Ring({ progress, size = 76 }: { progress: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-amber)" strokeOpacity="0.18" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-amber)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.min(progress, 1)) }}
        transition={{ duration: 1, ease }}
      />
    </svg>
  );
}

export function Goals({ className }: { className?: string }) {
  const { state, run } = useBank();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ goal?: Goal } | null>(null);
  const from = primaryChecking(state);
  const savings = state.accounts.find((a) => a.type === "savings");

  const add = async (goalId: string, name: string, amount: number) => {
    if (!from) return;
    if (amount > from.balance) {
      toast.error(`Not enough in ${from.name}`, { description: `You have ${formatMoney(from.balance)} available.` });
      return;
    }
    const result = await run({ type: "addToGoal", goalId, from: from.id, amount });
    if (!result.ok) return;
    toast.success(`Added ${formatMoney(amount)} to ${name}`, { description: `Moved from ${from.name}.` });
    setOpen(null);
  };

  return (
    <Panel className={className} aria-labelledby="goals-title">
      <PanelHeader
        id="goals-title"
        title="Savings goals"
        action={
          <button
            type="button"
            onClick={() => setEditing({})}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:ring-amber"
          >
            <Plus className="size-4" aria-hidden /> New goal
          </button>
        }
      >
        {savings?.apy ? `Kept in ${savings.name}, earning ${formatRate(savings.apy)} APY` : "Put money aside for the things that matter"}
      </PanelHeader>
      {!state.goals.length && (
        <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">
          No goals yet. Create one to start saving towards something.
        </p>
      )}
      <GoalDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} goal={editing?.goal} />
      <ul className="space-y-3">
        {state.goals.map((g) => {
          const progress = g.saved / g.target;
          return (
            <li key={g.id} className="rounded-2xl bg-canvas p-3">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Ring progress={progress} size={64} />
                  <span className="figures absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink">
                    {Math.min(Math.round(progress * 100), 100)}%
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setEditing({ goal: g })}
                    className="group flex max-w-full items-center gap-1.5 text-left font-semibold text-ink"
                    aria-label={`Edit ${g.name}`}
                  >
                    <span className="truncate">{g.name}</span>
                    <Pencil className="size-3.5 shrink-0 text-slate opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                  </button>
                  <p className="text-sm text-slate">
                    <Money value={g.saved} className="font-semibold text-ink" /> of <Money value={g.target} always />
                    {g.saved >= g.target && <span className="ml-1.5 font-semibold text-positive">Reached</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(open === g.id ? null : g.id)}
                  aria-expanded={open === g.id}
                  aria-label={open === g.id ? `Close add money to ${g.name}` : `Add money to ${g.name}`}
                  className="flex size-9 items-center justify-center rounded-full bg-panel text-ink ring-1 ring-line transition-colors hover:ring-amber"
                >
                  <motion.span animate={{ rotate: open === g.id ? 45 : 0 }} transition={{ duration: 0.2 }} className="flex">
                    <Plus className="size-4" aria-hidden />
                  </motion.span>
                </button>
              </div>
              <AnimatePresence initial={false}>
                {open === g.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-2 pt-3">
                      <span className="text-xs text-slate">Add from checking</span>
                      {[25, 50, 100, 250].map((n) => (
                        <motion.button
                          key={n}
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={() => add(g.id, g.name, n)}
                          className="figures rounded-full bg-panel px-3 py-1 text-sm font-semibold text-ink ring-1 ring-line hover:ring-amber"
                        >
                          +${n}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ------------------------------------------------------------------ bills */

export function UpcomingBills({ className }: { className?: string }) {
  const { state } = useBank();
  const move = useMoveMoney();
  const [editing, setEditing] = useState<{ bill?: Bill } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const all = upcomingBills(state);
  const list = showAll ? all : all.slice(0, 5);

  return (
    <Panel className={className} aria-labelledby="bills-title">
      <PanelHeader
        id="bills-title"
        title="Coming up"
        action={
          <button
            type="button"
            onClick={() => setEditing({})}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:ring-amber"
          >
            <Plus className="size-4" aria-hidden /> Add bill
          </button>
        }
      >
        Bills and subscriptions
      </PanelHeader>
      {!all.length && (
        <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">
          No bills yet. Add the ones you pay each month and we’ll keep track, or pay them for you.
        </p>
      )}
      <ul className="space-y-1">
        {list.map((b) => {
          const canPay = !b.paid && (!b.autopay || b.failed);
          return (
            <li key={b.id} className="flex items-center gap-3 rounded-2xl px-1 py-2">
              <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-canvas leading-none">
                <span className="text-[0.6rem] font-semibold text-slate uppercase">{b.due.toLocaleDateString("en-US", { month: "short" })}</span>
                <span className="figures font-heading text-base font-semibold text-ink">{b.due.getDate()}</span>
              </span>
              <span className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setEditing({ bill: b })}
                  className="group flex max-w-full items-center gap-1.5 text-left text-sm font-semibold text-ink"
                  aria-label={`Edit ${b.name}`}
                >
                  <span className="truncate">{b.name}</span>
                  <Pencil className="size-3 shrink-0 text-slate opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                </button>
                <span className="flex items-center gap-1.5 text-xs text-slate">
                  {b.failed ? (
                    <Pill className="bg-negative/10 text-negative">
                      <CircleAlert className="size-3" aria-hidden /> Autopay failed
                    </Pill>
                  ) : b.paid ? (
                    <Pill className="bg-positive/10 text-positive">
                      <Check className="size-3" aria-hidden /> Paid this month
                    </Pill>
                  ) : b.autopay ? (
                    <Pill className="bg-positive/10 text-positive">
                      <Repeat className="size-3" aria-hidden /> Autopay
                    </Pill>
                  ) : b.daysLeft <= 7 ? (
                    <Pill className="bg-amber-soft text-amber-ink">Due {b.daysLeft === 0 ? "today" : `in ${b.daysLeft} day${b.daysLeft === 1 ? "" : "s"}`}</Pill>
                  ) : (
                    <span>In {b.daysLeft} days</span>
                  )}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Money value={b.amount} always className="text-sm font-semibold text-ink" />
                {canPay && (
                  <button
                    type="button"
                    onClick={() => move.open("bill", { to: b.id, amount: b.amount })}
                    className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-surface hover:bg-ink/85"
                  >
                    Pay
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {all.length > 5 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 px-1 text-sm font-semibold text-ink hover:text-amber-ink">
          {showAll ? "Show fewer" : `Show all ${all.length} bills`}
        </button>
      )}
      <BillDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} bill={editing?.bill} />
    </Panel>
  );
}

/* --------------------------------------------------------------- interest */

/** Interest this month, ticking up in real time. */
export function LiveInterest({ className }: { className?: string }) {
  const { state } = useBank();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const earned = interestThisMonth(state, now);
  const perDay = interestPerSecond(state) * 86_400;
  const next = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

  return (
    <Panel className={cn("relative overflow-hidden", className)} aria-labelledby="interest-title">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-positive opacity-60 motion-reduce:hidden" />
          <span className="relative size-2 rounded-full bg-positive" />
        </span>
        <h2 id="interest-title" className="text-sm font-semibold text-ink">
          Interest earned this month
        </h2>
      </div>
      <p className="figures mt-3 font-heading text-[1.9rem] leading-none font-semibold tracking-[-0.02em] text-ink" aria-live="off">
        {state.hideBalances ? "$•••••" : `$${earned.toFixed(4)}`}
      </p>
      <p className="mt-2 text-sm text-slate">
        About <span className="font-semibold text-positive">{formatMoney(perDay)}</span> a day, paid on{" "}
        {next.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
      <Sparkles className="absolute -right-2 -bottom-2 size-20 text-amber/10" aria-hidden />
    </Panel>
  );
}

/* ------------------------------------------------------------- loans soon */

export function LoansTeaser({ className }: { className?: string }) {
  const { state, dispatch } = useBank();
  const joined = state.loanWaitlist.includes("personal");
  const personal = loanProducts.find((p) => p.id === "personal")!;

  return (
    <section aria-labelledby="loans-teaser-title" className={cn("relative overflow-hidden rounded-[1.75rem] bg-amber-soft p-5 sm:p-6", className)}>
      <HandCoins className="absolute -top-3 -right-3 size-20 text-amber/15" aria-hidden />
      <Pill className="bg-amber/20 text-amber-ink">
        <span className="size-1.5 animate-pulse rounded-full bg-amber" /> Coming soon
      </Pill>
      <h2 id="loans-teaser-title" className="mt-3 font-heading text-lg leading-snug font-semibold tracking-[-0.015em] text-ink">
        Loans from {formatRate(lowestLoanApr)} APR
      </h2>
      <p className="mt-1 text-sm text-ink/70">Personal loans from {formatRate(personal.fromApr)} APR, with no fee for paying early.</p>
      <div className="relative mt-4 flex flex-wrap items-center gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {joined ? (
            <motion.span key="joined" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Check className="size-4 text-positive" aria-hidden /> You’re on the waitlist
            </motion.span>
          ) : (
            <motion.button
              key="join"
              type="button"
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                dispatch({ type: "joinWaitlist", product: "personal" });
                toast.success("You’re on the waitlist", { description: "We’ll tell you the day personal loans open." });
              }}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface hover:bg-ink/85"
            >
              Join the waitlist
            </motion.button>
          )}
        </AnimatePresence>
        <Link href="/dashboard/loans" className="text-sm font-semibold text-ink underline-offset-4 hover:underline">
          See rates
        </Link>
      </div>
    </section>
  );
}

