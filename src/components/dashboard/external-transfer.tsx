"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch, type FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Clock, Globe, Landmark, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { primaryChecking, spendableAccounts } from "@/components/dashboard/data";
import { useBank } from "@/components/dashboard/store";
import { Money } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/rates";
import { compactAccount, externalTransferSchema, type ExternalTransferValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export const INTL_PROCESSING_NOTE = "International transfers take 7 days to process.";

const fieldClass =
  "h-11 w-full rounded-xl border border-input bg-panel px-3.5 text-[0.95rem] text-ink outline-none placeholder:text-slate/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive";

/** Send money to anyone at another bank, in the US or abroad. It waits for our team to approve it. */
export function ExternalTransferFlow({ onClose, onStep }: { onClose?: () => void; onStep?: (step: "form" | "review" | "done") => void }) {
  const { state, run } = useBank();
  const [step, setStepState] = useState<"form" | "review" | "done">("form");
  const setStep = (s: "form" | "review" | "done") => {
    setStepState(s);
    onStep?.(s);
  };
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState<ExternalTransferValues | null>(null);
  const spendable = spendableAccounts(state);
  const fromDefault = primaryChecking(state)?.id ?? spendable[0]?.id ?? "";

  // The shared rules, plus the balance, which only the screen knows.
  const schema = useMemo(
    () =>
      externalTransferSchema.superRefine((v, ctx) => {
        const available = state.accounts.find((a) => a.id === v.from)?.balance ?? 0;
        if (v.amount > available) ctx.addIssue({ code: "custom", path: ["amount"], message: `That’s more than the ${formatMoney(available)} available.` });
      }),
    [state.accounts],
  );

  const blank: ExternalTransferValues = {
    scope: "domestic",
    from: fromDefault,
    amount: undefined as unknown as number,
    recipientName: "",
    bankName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    routingNumber: "",
    swiftCode: "",
    bankCountry: "",
    recipientAddress: "",
    note: "",
  };
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<ExternalTransferValues>({ resolver: zodResolver(schema), defaultValues: blank });
  const values = useWatch({ control });
  const intl = values.scope === "international";
  const fromAccount = state.accounts.find((a) => a.id === values.from);

  const setScope = (scope: ExternalTransferValues["scope"]) => {
    setValue("scope", scope);
    clearErrors();
  };

  const onConfirm = async () => {
    const v = values as ExternalTransferValues;
    setProcessing(true);
    const result = await run({ type: "externalTransfer", transfer: v });
    setProcessing(false);
    if (!result.ok) return; // the store has already shown why
    setConfirmed(v);
    setStep("done");
    toast.success("Transfer sent for approval", { description: `${formatMoney(v.amount)} to ${v.recipientName}` });
  };

  if (!spendable.length) {
    return <p className="rounded-2xl bg-canvas px-4 py-5 text-sm text-slate">You don’t have an account you can send money from. Call us if that’s not right.</p>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === "form" && (
        <motion.form
          key="form"
          onSubmit={handleSubmit(() => setStep("review"))}
          noValidate
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease }}
          className="space-y-6"
        >
          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold text-ink">Where is their bank?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "domestic", label: "In the US", hint: "Routing number", icon: Landmark },
                  { id: "international", label: "Abroad", hint: "SWIFT and IBAN", icon: Globe },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={values.scope === s.id}
                  onClick={() => setScope(s.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition-all",
                    values.scope === s.id ? "bg-amber-soft ring-amber" : "ring-line hover:ring-ink/30",
                  )}
                >
                  <s.icon className="size-5 shrink-0 text-ink" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{s.label}</span>
                    <span className="text-xs text-slate">{s.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            {intl && (
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-soft px-4 py-3 text-sm text-amber-ink" role="note">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <strong className="font-semibold">{INTL_PROCESSING_NOTE}</strong> Transfers are sent in US dollars; the recipient’s bank may convert them.
                </span>
              </p>
            )}
          </fieldset>

          <fieldset className="grid gap-4">
            <legend className="mb-2.5 text-sm font-semibold text-ink">Who are you paying?</legend>
            <TextField id="xt-name" label="Name on their account" error={errors.recipientName} autoComplete="off" {...register("recipientName")} />
            <TextField id="xt-bank" label="Their bank" placeholder={intl ? "For example, Barclays" : "For example, Chase"} error={errors.bankName} autoComplete="off" {...register("bankName")} />
            {intl ? (
              <>
                <TextField id="xt-swift" label="SWIFT/BIC code" placeholder="8 or 11 characters" className="uppercase" error={errors.swiftCode} autoComplete="off" spellCheck={false} {...register("swiftCode")} />
                <TextField id="xt-account" label="IBAN or account number" className="font-mono" error={errors.accountNumber} autoComplete="off" spellCheck={false} {...register("accountNumber")} />
                <TextField id="xt-account2" label="IBAN or account number again" className="font-mono" error={errors.confirmAccountNumber} autoComplete="off" spellCheck={false} onPaste={(e) => e.preventDefault()} {...register("confirmAccountNumber")} />
                <TextField id="xt-country" label="Country the bank is in" error={errors.bankCountry} autoComplete="off" {...register("bankCountry")} />
                <TextField id="xt-address" label="Recipient’s address" placeholder="Street, city, postcode" error={errors.recipientAddress} autoComplete="off" {...register("recipientAddress")} />
              </>
            ) : (
              <>
                <TextField id="xt-routing" label="Routing number" inputMode="numeric" placeholder="9 digits" className="font-mono" error={errors.routingNumber} autoComplete="off" {...register("routingNumber")} />
                <TextField id="xt-account" label="Account number" inputMode="numeric" className="font-mono" error={errors.accountNumber} autoComplete="off" {...register("accountNumber")} />
                <TextField id="xt-account2" label="Account number again" inputMode="numeric" className="font-mono" error={errors.confirmAccountNumber} autoComplete="off" onPaste={(e) => e.preventDefault()} {...register("confirmAccountNumber")} />
              </>
            )}
          </fieldset>

          <div>
            <label htmlFor="xt-amount" className="mb-2.5 block text-sm font-semibold text-ink">
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
                id="xt-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                aria-invalid={!!errors.amount}
                aria-describedby="xt-amount-hint"
                className="figures w-full max-w-[12ch] bg-transparent text-center font-heading text-[2.6rem] leading-none font-semibold tracking-[-0.03em] text-ink outline-none placeholder:text-slate/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                {...register("amount", { valueAsNumber: true })}
              />
            </div>
            <p id="xt-amount-hint" className={cn("mt-2 text-center text-sm", errors.amount ? "text-destructive" : "text-slate")} role={errors.amount ? "alert" : undefined}>
              {errors.amount?.message ?? (
                <>
                  Available in {fromAccount?.short}: <Money value={fromAccount?.balance ?? 0} always className="font-semibold text-ink" />
                </>
              )}
            </p>
          </div>

          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold text-ink">From</legend>
            <div className="grid grid-cols-2 gap-2">
              {spendable.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={values.from === a.id}
                  onClick={() => setValue("from", a.id, { shouldValidate: !!values.amount })}
                  className={cn("rounded-2xl px-4 py-3 text-left ring-1 transition-all", values.from === a.id ? "bg-amber-soft ring-amber" : "ring-line hover:ring-ink/30")}
                >
                  <span className="block text-sm font-semibold text-ink">{a.short}</span>
                  <Money value={a.balance} always className="text-xs text-slate" />
                </button>
              ))}
            </div>
          </fieldset>

          <TextField id="xt-note" label={<>Note <span className="font-normal text-slate">(optional)</span></>} maxLength={60} placeholder="What’s it for?" error={errors.note} {...register("note")} />

          <Button type="submit" variant="ink" size="xl" className="w-full">
            Review
          </Button>
        </motion.form>
      )}

      {step === "review" && (
        <motion.div key="review" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25, ease }}>
          <button type="button" onClick={() => setStep("form")} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> Edit
          </button>
          <p className="text-sm text-slate">{intl ? "International transfer" : "Transfer to another bank"}</p>
          <p className="mt-1 font-heading text-[2.6rem] leading-tight font-semibold tracking-[-0.03em] text-ink">
            <Money value={values.amount ?? 0} always />
          </p>
          <dl className="mt-6 divide-y divide-line rounded-2xl bg-canvas px-4 text-sm">
            <Row term="From" detail={fromAccount?.name} />
            <Row term="To" detail={values.recipientName} />
            <Row term="Bank" detail={intl ? `${values.bankName}, ${values.bankCountry}` : values.bankName} />
            {intl ? <Row term="SWIFT/BIC" detail={compactAccount(values.swiftCode ?? "")} mono /> : <Row term="Routing number" detail={compactAccount(values.routingNumber ?? "")} mono />}
            <Row term={intl ? "IBAN or account" : "Account number"} detail={compactAccount(values.accountNumber ?? "")} mono />
            {intl && <Row term="Address" detail={values.recipientAddress} />}
            <Row term="Processing" detail={intl ? "7 days, after approval" : "After our team approves it"} />
            {values.note && <Row term="Note" detail={values.note} />}
          </dl>
          <p className="mt-4 flex items-start gap-2 text-sm text-slate">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
            <span>
              The money is held from your account now. Our team checks every transfer before it’s sent. If we can’t send it, you’ll see why and the money comes straight back.
              {intl && <strong className="mt-1 block font-semibold text-ink">{INTL_PROCESSING_NOTE}</strong>}
            </span>
          </p>
          <Button type="button" variant="amber" size="xl" className="mt-6 w-full" onClick={onConfirm} disabled={processing}>
            {processing ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            {processing ? "Sending" : "Send for approval"}
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
          <span className="flex size-20 items-center justify-center rounded-full bg-amber-soft text-amber-ink">
            <Clock className="size-9" aria-hidden />
          </span>
          <p className="mt-6 font-heading text-2xl font-semibold tracking-[-0.02em] text-ink">Waiting for approval</p>
          <p className="mt-2 text-slate">
            <Money value={confirmed.amount} always className="font-semibold text-ink" /> to {confirmed.recipientName} at {confirmed.bankName}
          </p>
          <p className="mt-3 max-w-sm text-sm text-slate">
            We’ll let you know as soon as our team approves it.
            {confirmed.scope === "international" && <strong className="block font-semibold text-ink">{INTL_PROCESSING_NOTE}</strong>}
          </p>
          <div className="mt-8 flex w-full gap-2">
            <Button
              type="button"
              variant="outline-ink"
              size="xl"
              className="flex-1"
              onClick={() => {
                setConfirmed(null);
                reset({ ...blank, scope: confirmed.scope });
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
  );
}

function TextField({
  id,
  label,
  error,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "id"> & { id: string; label: React.ReactNode; error?: FieldError }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={cn(fieldClass, className)} {...props} />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}

function Row({ term, detail, mono }: { term: string; detail?: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="shrink-0 text-slate">{term}</dt>
      <dd className={cn("min-w-0 text-right font-semibold break-words text-ink", mono && "font-mono text-[0.85rem]")}>{detail}</dd>
    </div>
  );
}
