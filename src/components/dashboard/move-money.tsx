"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowLeftRight, Check, Loader2, Receipt, Send } from "lucide-react";
import { toast } from "sonner";
import { primaryChecking, spendableAccounts } from "@/components/dashboard/data";
import { upcomingBills } from "@/components/dashboard/selectors";
import { useBank } from "@/components/dashboard/store";
import { Avatar, Money } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/rates";
import { cn } from "@/lib/utils";

export type MoveMode = "transfer" | "send" | "bill";
type Preset = { to?: string; amount?: number };

const modes: { id: MoveMode; label: string; icon: typeof Send; title: string }[] = [
  { id: "transfer", label: "Transfer", icon: ArrowLeftRight, title: "Move money between your accounts" },
  { id: "send", label: "Send", icon: Send, title: "Send money to someone" },
  { id: "bill", label: "Pay a bill", icon: Receipt, title: "Pay a bill" },
];

const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------ open from anywhere */

type MoveCtx = { open: (mode?: MoveMode, preset?: Preset) => void };
const MoveContext = createContext<MoveCtx | null>(null);
export const useMoveMoney = () => {
  const ctx = useContext(MoveContext);
  if (!ctx) throw new Error("useMoveMoney must be used inside <MoveMoneyProvider>");
  return ctx;
};

const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function MoveMoneyProvider({ children }: { children: React.ReactNode }) {
  const [openState, setOpenState] = useState<{ mode: MoveMode; preset?: Preset; key: number } | null>(null);
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia("(min-width: 768px)").matches, () => true);
  const open = useCallback((mode: MoveMode = "transfer", preset?: Preset) => setOpenState({ mode, preset, key: Date.now() }), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <MoveContext.Provider value={value}>
      {children}
      <Sheet open={!!openState} onOpenChange={(o) => !o && setOpenState(null)}>
        <SheetContent
          side={wide ? "right" : "bottom"}
          className={cn(
            "gap-0 overflow-y-auto bg-panel p-0",
            wide ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-[1.75rem]",
          )}
        >
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="font-heading text-xl font-semibold tracking-[-0.02em]">Move money</SheetTitle>
            <SheetDescription>Transfers between your accounts arrive instantly.</SheetDescription>
          </SheetHeader>
          {openState && (
            <div className="px-6 pb-8">
              <MoveMoneyFlow key={openState.key} initialMode={openState.mode} preset={openState.preset} onClose={() => setOpenState(null)} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </MoveContext.Provider>
  );
}

/* -------------------------------------------------------------- the flow */

type Values = { from: string; to: string; amount: number; note?: string };

export function MoveMoneyFlow({
  initialMode = "transfer",
  preset,
  onClose,
}: {
  initialMode?: MoveMode;
  preset?: Preset;
  onClose?: () => void;
}) {
  const { state, run } = useBank();
  const [mode, setMode] = useState<MoveMode>(initialMode);
  const [step, setStep] = useState<"form" | "review" | "done">("form");
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState<Values | null>(null);

  const bills = upcomingBills(state).filter((b) => !b.paid);
  const spendable = spendableAccounts(state);
  const fromDefault = primaryChecking(state)?.id ?? "";
  // Default destination for a transfer: the first other account (usually savings).
  const transferTo = spendable.find((a) => a.id !== fromDefault && a.type === "savings")?.id ?? spendable.find((a) => a.id !== fromDefault)?.id ?? "";

  const schema = useMemo(
    () =>
      z
        .object({
          from: z.string().min(1, "Choose an account to pay from."),
          to: z.string().min(1, mode === "send" ? "Choose who to pay." : mode === "bill" ? "Choose a bill." : "Choose an account."),
          amount: z.number({ error: "Enter an amount." }).positive("Enter an amount above $0.").max(25000, "Online transfers are limited to $25,000. Call us for larger amounts."),
          note: z.string().trim().max(60, "Keep the note under 60 characters.").optional(),
        })
        .superRefine((v, ctx) => {
          const available = state.accounts.find((a) => a.id === v.from)?.balance ?? 0;
          if (v.amount > available) {
            ctx.addIssue({ code: "custom", path: ["amount"], message: `That’s more than the ${formatMoney(available)} available.` });
          }
          if (mode === "transfer" && v.from === v.to) {
            ctx.addIssue({ code: "custom", path: ["to"], message: "Choose a different account to move money into." });
          }
        }, {
          // Check the balance even while another field is still empty, so every problem shows at once.
          when: (payload) => {
            const v = payload.value as Partial<Values> | undefined;
            return typeof v?.amount === "number" && Number.isFinite(v.amount) && v.amount > 0;
          },
        }),
    [mode, state.accounts],
  );

  const defaultTo = preset?.to ?? (mode === "transfer" ? transferTo : mode === "bill" ? (bills[0]?.id ?? "") : "");
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      from: fromDefault,
      to: defaultTo,
      amount: preset?.amount ?? (mode === "bill" ? bills.find((b) => b.id === defaultTo)?.amount : undefined),
      note: "",
    },
  });
  const values = useWatch({ control });

  const switchMode = (m: MoveMode) => {
    setMode(m);
    const to = m === "transfer" ? transferTo : m === "bill" ? (bills[0]?.id ?? "") : "";
    reset({ from: fromDefault, to, amount: m === "bill" ? bills[0]?.amount : undefined, note: "" });
  };

  const toLabel = (v: Partial<Values>) => {
    if (mode === "transfer") return state.accounts.find((a) => a.id === v.to)?.name ?? "";
    if (mode === "send") return state.payees.find((p) => p.id === v.to)?.name ?? "";
    return state.bills.find((b) => b.id === v.to)?.name ?? "";
  };

  const onReview = handleSubmit(() => setStep("review"));

  const onConfirm = async () => {
    const v = values as Values;
    setProcessing(true);
    const result = await run(
      mode === "transfer"
        ? { type: "transfer", from: v.from, to: v.to, amount: v.amount, note: v.note || undefined }
        : mode === "send"
          ? { type: "send", from: v.from, payeeId: v.to, amount: v.amount, note: v.note || undefined }
          : { type: "payBill", billId: v.to, from: v.from },
    );
    setProcessing(false);
    if (!result.ok) return; // the store has already shown why
    setConfirmed(v);
    setStep("done");
    toast.success(mode === "transfer" ? "Transfer complete" : mode === "send" ? "Payment sent" : "Bill paid", {
      description: `${formatMoney(v.amount)} to ${toLabel(v)}`,
    });
  };

  const current = modes.find((m) => m.id === mode)!;

  return (
    <div>
      {step === "form" && (
        <div role="tablist" aria-label="Type of payment" className="mb-6 grid grid-cols-3 gap-1 rounded-2xl bg-canvas p-1">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === mode}
              onClick={() => switchMode(m.id)}
              className={cn(
                "relative flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors",
                m.id === mode ? "text-ink" : "text-slate hover:text-ink",
              )}
            >
              {m.id === mode && (
                <motion.span layoutId="move-mode" className="absolute inset-0 rounded-xl bg-panel shadow-sm ring-1 ring-line" transition={{ type: "spring", bounce: 0.18, duration: 0.45 }} />
              )}
              <m.icon className="relative size-4" aria-hidden />
              <span className="relative">{m.label}</span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {step === "form" && (
          <motion.form
            key={`form-${mode}`}
            onSubmit={onReview}
            noValidate
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease }}
            className="space-y-6"
          >
            {/* Destination */}
            <fieldset>
              <legend className="mb-2.5 text-sm font-semibold text-ink">
                {mode === "transfer" ? "To" : mode === "send" ? "Who are you paying?" : "Which bill?"}
              </legend>
              {mode === "transfer" && spendable.length < 2 && (
                <p className="rounded-2xl bg-canvas px-4 py-5 text-sm text-slate">
                  You need two accounts to move money between them. Ask us about opening a savings account.
                </p>
              )}
              {mode === "transfer" && spendable.length >= 2 && (
                <div className="grid gap-2">
                  {spendable.map((a) => (
                    <ChoiceRow key={a.id} selected={values.to === a.id} onSelect={() => setValue("to", a.id, { shouldValidate: true })} title={a.name} subtitle={`••${a.mask}`} trailing={<Money value={a.balance} className="text-sm font-semibold text-ink" />} />
                  ))}
                </div>
              )}
              {mode === "send" && !state.payees.length && (
                <p className="rounded-2xl bg-canvas px-4 py-5 text-sm text-slate">
                  No saved payees yet. For your security, people you pay are added at a branch or by phone.
                </p>
              )}
              {mode === "send" && state.payees.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {state.payees.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={values.to === p.id}
                      onClick={() => setValue("to", p.id, { shouldValidate: true })}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center ring-1 transition-all",
                        values.to === p.id ? "bg-amber-soft ring-amber" : "ring-line hover:ring-ink/30",
                      )}
                    >
                      <Avatar name={p.name} className="size-11" />
                      <span className="text-xs leading-tight font-semibold text-ink">{p.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              )}
              {mode === "bill" &&
                (bills.length ? (
                  <div className="grid gap-2">
                    {bills.map((b) => (
                      <ChoiceRow
                        key={b.id}
                        selected={values.to === b.id}
                        onSelect={() => {
                          setValue("to", b.id, { shouldValidate: true });
                          setValue("amount", b.amount, { shouldValidate: true });
                        }}
                        title={b.name}
                        subtitle={`Due ${b.due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${b.autopay ? ", autopay on" : ""}`}
                        trailing={<Money value={b.amount} always className="text-sm font-semibold text-ink" />}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-canvas px-4 py-5 text-sm text-slate">Every bill is paid for this month. Nice work.</p>
                ))}
              {errors.to && <p className="mt-2 text-sm text-destructive" role="alert">{errors.to.message}</p>}
            </fieldset>

            {/* Amount */}
            <div>
              <label htmlFor="move-amount" className="mb-2.5 block text-sm font-semibold text-ink">
                Amount
              </label>
              <div
                className={cn(
                  "flex items-baseline justify-center gap-1 rounded-2xl bg-canvas px-4 py-5 ring-1 transition-shadow focus-within:ring-2",
                  errors.amount ? "ring-destructive focus-within:ring-destructive" : "ring-transparent focus-within:ring-amber",
                )}
              >
                <span className="font-heading text-3xl font-semibold text-slate">$</span>
                <input
                  id="move-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  readOnly={mode === "bill"}
                  aria-invalid={!!errors.amount}
                  aria-describedby="move-amount-hint"
                  className="figures w-full max-w-[12ch] bg-transparent text-center font-heading text-[2.6rem] leading-none font-semibold tracking-[-0.03em] text-ink outline-none placeholder:text-slate/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  {...register("amount", { valueAsNumber: true })}
                />
              </div>
              {mode !== "bill" && (
                <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                  {[25, 50, 100, 250, 500].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setValue("amount", n, { shouldValidate: true })}
                      className="figures rounded-full px-3 py-1 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-canvas hover:ring-ink/30"
                    >
                      ${n}
                    </button>
                  ))}
                </div>
              )}
              <p id="move-amount-hint" className={cn("mt-2 text-center text-sm", errors.amount ? "text-destructive" : "text-slate")} role={errors.amount ? "alert" : undefined}>
                {errors.amount?.message ?? (
                  <>
                    Available in {state.accounts.find((a) => a.id === values.from)?.short}:{" "}
                    <Money value={state.accounts.find((a) => a.id === values.from)?.balance ?? 0} always className="font-semibold text-ink" />
                  </>
                )}
              </p>
            </div>

            {/* Source */}
            <fieldset>
              <legend className="mb-2.5 text-sm font-semibold text-ink">From</legend>
              <div className="grid grid-cols-2 gap-2">
                {spendable.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={values.from === a.id}
                    onClick={() => setValue("from", a.id, { shouldValidate: !!values.amount })}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-left ring-1 transition-all",
                      values.from === a.id ? "bg-amber-soft ring-amber" : "ring-line hover:ring-ink/30",
                    )}
                  >
                    <span className="block text-sm font-semibold text-ink">{a.short}</span>
                    <Money value={a.balance} always className="text-xs text-slate" />
                  </button>
                ))}
              </div>
            </fieldset>

            {mode !== "bill" && (
              <div>
                <label htmlFor="move-note" className="mb-2.5 block text-sm font-semibold text-ink">
                  Note <span className="font-normal text-slate">(optional)</span>
                </label>
                <input
                  id="move-note"
                  maxLength={60}
                  placeholder={mode === "send" ? "What’s it for?" : "For example, Japan trip"}
                  className="h-11 w-full rounded-xl border border-input bg-panel px-3.5 text-[0.95rem] text-ink outline-none placeholder:text-slate/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                  {...register("note")}
                />
                {errors.note && <p className="mt-2 text-sm text-destructive" role="alert">{errors.note.message}</p>}
              </div>
            )}

            <Button type="submit" variant="ink" size="xl" className="w-full" disabled={mode === "bill" && !bills.length}>
              Review
            </Button>
          </motion.form>
        )}

        {step === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease }}
          >
            <button type="button" onClick={() => setStep("form")} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden /> Edit
            </button>
            <p className="text-sm text-slate">{current.title}</p>
            <p className="mt-1 font-heading text-[2.6rem] leading-tight font-semibold tracking-[-0.03em] text-ink">
              <Money value={values.amount ?? 0} always />
            </p>
            <dl className="mt-6 divide-y divide-line rounded-2xl bg-canvas px-4 text-sm">
              <Row term="From" detail={state.accounts.find((a) => a.id === values.from)?.name} />
              <Row term="To" detail={toLabel(values)} />
              <Row term="Arrives" detail={mode === "send" ? "Within one business day" : "Instantly"} />
              {values.note && <Row term="Note" detail={values.note} />}
            </dl>
            <Button type="button" variant="amber" size="xl" className="mt-6 w-full" onClick={onConfirm} disabled={processing}>
              {processing ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
              {processing ? "Sending" : mode === "transfer" ? "Confirm transfer" : mode === "send" ? "Send money" : "Pay bill"}
            </Button>
          </motion.div>
        )}

        {step === "done" && confirmed && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease }}
            className="flex flex-col items-center py-6 text-center"
            role="status"
          >
            <SuccessCheck />
            <p className="mt-6 font-heading text-2xl font-semibold tracking-[-0.02em] text-ink">
              {mode === "transfer" ? "Transfer complete" : mode === "send" ? "Payment sent" : "Bill paid"}
            </p>
            <p className="mt-2 text-slate">
              <Money value={confirmed.amount} always className="font-semibold text-ink" /> to {toLabel(confirmed)}
            </p>
            <div className="mt-8 flex w-full gap-2">
              <Button
                type="button"
                variant="outline-ink"
                size="xl"
                className="flex-1"
                onClick={() => {
                  setConfirmed(null);
                  switchMode(mode);
                  setStep("form");
                }}
              >
                Make another
              </Button>
              {onClose && (
                <Button type="button" variant="ink" size="xl" className="flex-1" onClick={onClose}>
                  Done
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChoiceRow({
  selected,
  onSelect,
  title,
  subtitle,
  trailing,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  trailing: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition-all",
        selected ? "bg-amber-soft ring-amber" : "ring-line hover:ring-ink/30",
      )}
    >
      <span className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full ring-2 transition-colors",
            selected ? "bg-amber ring-amber" : "ring-line",
          )}
        >
          {selected && <Check className="size-3 text-deep" strokeWidth={3} aria-hidden />}
        </span>
        <span>
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="text-xs text-slate">{subtitle}</span>
        </span>
      </span>
      {trailing}
    </button>
  );
}

function Row({ term, detail }: { term: string; detail?: string }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-slate">{term}</dt>
      <dd className="text-right font-semibold text-ink">{detail}</dd>
    </div>
  );
}

function SuccessCheck() {
  return (
    <div className="relative flex size-24 items-center justify-center">
      <motion.span
        className="absolute inset-0 rounded-full bg-positive/15"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.15, 1], opacity: 1 }}
        transition={{ duration: 0.6, ease }}
      />
      <svg viewBox="0 0 52 52" className="relative size-14 text-positive" aria-hidden>
        <motion.circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease }} />
        <motion.path d="M15 27 l7 7 l15 -16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.4, ease }} />
      </svg>
    </div>
  );
}
