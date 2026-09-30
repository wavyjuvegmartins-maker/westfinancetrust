"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownToLine, ArrowUpFromLine, Ban, KeyRound, Loader2, Mail, Plus, RotateCcw, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { CredentialsCard } from "@/components/admin/credentials-card";
import { inputClass } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  addPayee,
  emailLoanWaitlist,
  markMessageHandled,
  removePayee,
  openAdditionalAccount,
  postCash,
  resetCustomerPassword,
  setCustomerStatus,
  type Credentials,
} from "@/lib/admin/actions";
import { cashMovementSchema, payeeSchema, type CashMovementValues, type PayeeInput, type PayeeValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/* ------------------------------------------------------ deposit / withdraw */

export function CashButtons({ account, canPost }: { account: { id: string; number: string; name: string; balance: number }; canPost: boolean }) {
  const [kind, setKind] = useState<"deposit" | "withdrawal" | null>(null);
  if (!canPost) return null;
  return (
    <>
      <div className="flex gap-2">
        <Button type="button" variant="outline-ink" size="sm" className="rounded-full px-3" onClick={() => setKind("deposit")}>
          <ArrowDownToLine aria-hidden /> Deposit
        </Button>
        <Button type="button" variant="outline-ink" size="sm" className="rounded-full px-3" onClick={() => setKind("withdrawal")}>
          <ArrowUpFromLine aria-hidden /> Withdraw
        </Button>
      </div>
      <Dialog open={!!kind} onOpenChange={(o) => !o && setKind(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          {kind && <CashForm key={kind} kind={kind} account={account} onDone={() => setKind(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CashForm({
  kind,
  account,
  onDone,
}: {
  kind: "deposit" | "withdrawal";
  account: { id: string; number: string; name: string; balance: number };
  onDone: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "confirm">("form");
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CashMovementValues>({
    resolver: zodResolver(cashMovementSchema),
    defaultValues: { accountId: account.id, description: kind === "deposit" ? "Cash deposit at branch" : "Cash withdrawal at branch" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (step === "form") {
      if (kind === "withdrawal" && values.amount > account.balance) {
        toast.error("Not enough money in the account", { description: `The balance is ${money(account.balance)}.` });
        return;
      }
      setStep("confirm");
      return;
    }
    const res = await postCash(kind, values);
    if (!res.ok) {
      toast.error(res.message);
      setStep("form");
      return;
    }
    toast.success(res.message, { description: `${money(values.amount)} ${kind === "deposit" ? "to" : "from"} ${account.name} ${account.number}` });
    router.refresh();
    onDone();
  });

  const verb = kind === "deposit" ? "Deposit" : "Withdrawal";
  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">
          {step === "confirm" ? `Confirm ${verb.toLowerCase()}` : `${verb} ${kind === "deposit" ? "to" : "from"} ${account.name}`}
        </DialogTitle>
        <DialogDescription>
          Account {account.number}. Balance {money(account.balance)}.
        </DialogDescription>
      </DialogHeader>

      {step === "form" ? (
        <div className="mt-5 grid gap-4">
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="cash-amount" className="text-ink">Amount</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate">$</span>
              <Input id="cash-amount" type="number" step="0.01" min="0" autoFocus className={cn(inputClass, "pl-7 text-lg")} aria-invalid={!!errors.amount} {...register("amount", { valueAsNumber: true })} />
            </div>
            <FieldError errors={[errors.amount]} />
          </Field>
          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="cash-description" className="text-ink">Description the customer sees</FieldLabel>
            <Input id="cash-description" className={inputClass} aria-invalid={!!errors.description} {...register("description")} />
            <FieldError errors={[errors.description]} />
          </Field>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-canvas p-4 text-sm">
          <p className="font-heading text-3xl font-semibold text-ink">{money(getValues("amount"))}</p>
          <p className="mt-1 text-slate">{getValues("description")}</p>
          <p className="mt-3 text-slate">
            New balance{" "}
            <span className="font-semibold text-ink">
              {money(account.balance + (kind === "deposit" ? 1 : -1) * getValues("amount"))}
            </span>
          </p>
          <p className="mt-3 text-xs text-slate">This is recorded in the audit log under your name and the customer is notified.</p>
        </div>
      )}

      <DialogFooter className="mt-6 gap-2">
        <Button type="button" variant="outline-ink" size="md" onClick={() => (step === "confirm" ? setStep("form") : onDone())}>
          {step === "confirm" ? "Back" : "Cancel"}
        </Button>
        <Button type="submit" variant="ink" size="md" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {step === "confirm" ? `Post ${verb.toLowerCase()}` : "Review"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ---------------------------------------------------------- open account */

export function OpenAccountButton({ profileId, isAdmin, existing }: { profileId: string; isAdmin: boolean; existing: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"checking" | "savings" | "certificate">(existing.includes("savings") ? "certificate" : "savings");
  const [deposit, setDeposit] = useState("0");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button type="button" variant="outline-ink" size="md" onClick={() => setOpen(true)}>
        <Plus aria-hidden /> Open an account
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Open an account</DialogTitle>
            <DialogDescription>It’s assigned to this customer straight away.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {(["checking", "savings", "certificate"] as const).map((t) => (
              <label key={t} className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 ring-1", type === t ? "bg-amber-soft ring-amber" : "ring-line")}>
                <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} className="accent-amber-strong" />
                <span className="text-sm font-medium text-ink capitalize">{t === "certificate" ? "12-month certificate" : t}</span>
              </label>
            ))}
          </div>
          <label className="mt-2 block text-sm font-medium text-ink">
            Opening deposit
            <input
              type="number"
              min={0}
              step="0.01"
              value={deposit}
              disabled={!isAdmin}
              onChange={(e) => setDeposit(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-input bg-panel px-3 text-base text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60"
            />
          </label>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline-ink" size="md" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="ink"
              size="md"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const res = await openAdditionalAccount(profileId, type, Number(deposit) || 0);
                setBusy(false);
                if (!res.ok) return toast.error(res.message);
                toast.success(res.message);
                setOpen(false);
                router.refresh();
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />} Open account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ payee */

/** Adds someone the customer can pay. Used while the customer is on the phone or in the branch. */
export function AddPayeeButton({ profileId, customerName }: { profileId: string; customerName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PayeeInput, unknown, PayeeValues>({
    resolver: zodResolver(payeeSchema),
    defaultValues: { name: "", bankName: "", routingNumber: "", accountNumber: "", confirmAccountNumber: "", addedVia: "phone", verified: false as unknown as true },
  });
  const addedVia = useWatch({ control, name: "addedVia" });
  const verified = useWatch({ control, name: "verified" });

  const close = () => {
    reset();
    setOpen(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    const res = await addPayee(profileId, values);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    close();
    router.refresh();
  });

  return (
    <>
      <Button type="button" variant="outline-ink" size="sm" className="rounded-full px-3" onClick={() => setOpen(true)}>
        <UserPlus aria-hidden /> Add payee
      </Button>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Add someone {customerName} can pay</DialogTitle>
              <DialogDescription>Take the details from the customer and read the account number back to them before saving.</DialogDescription>
            </DialogHeader>

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-semibold text-ink">How did the customer ask?</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["phone", "branch"] as const).map((via) => (
                  <label
                    key={via}
                    className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium ring-1", addedVia === via ? "bg-amber-soft text-ink ring-amber" : "text-slate ring-line")}
                  >
                    <input type="radio" value={via} className="accent-amber-strong" {...register("addedVia")} />
                    {via === "phone" ? "On the phone" : "In the branch"}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 grid gap-4">
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="payee-name" className="text-ink">Name on their account</FieldLabel>
                <Input id="payee-name" autoComplete="off" className={inputClass} aria-invalid={!!errors.name} {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.bankName}>
                <FieldLabel htmlFor="payee-bank" className="text-ink">Their bank</FieldLabel>
                <Input id="payee-bank" autoComplete="off" className={inputClass} aria-invalid={!!errors.bankName} {...register("bankName")} />
                <FieldError errors={[errors.bankName]} />
              </Field>
              <Field data-invalid={!!errors.routingNumber}>
                <FieldLabel htmlFor="payee-routing" className="text-ink">Routing number</FieldLabel>
                <Input id="payee-routing" inputMode="numeric" autoComplete="off" maxLength={11} className={cn(inputClass, "font-mono tracking-wider")} aria-invalid={!!errors.routingNumber} {...register("routingNumber")} />
                <FieldDescription>9 digits. We check it’s a real routing number.</FieldDescription>
                <FieldError errors={[errors.routingNumber]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.accountNumber}>
                  <FieldLabel htmlFor="payee-account" className="text-ink">Account number</FieldLabel>
                  <Input id="payee-account" inputMode="numeric" autoComplete="off" maxLength={20} className={cn(inputClass, "font-mono tracking-wider")} aria-invalid={!!errors.accountNumber} {...register("accountNumber")} />
                  <FieldError errors={[errors.accountNumber]} />
                </Field>
                <Field data-invalid={!!errors.confirmAccountNumber}>
                  <FieldLabel htmlFor="payee-account-confirm" className="text-ink">Account number again</FieldLabel>
                  <Input
                    id="payee-account-confirm"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={20}
                    onPaste={(e) => e.preventDefault()}
                    className={cn(inputClass, "font-mono tracking-wider")}
                    aria-invalid={!!errors.confirmAccountNumber}
                    {...register("confirmAccountNumber")}
                  />
                  <FieldError errors={[errors.confirmAccountNumber]} />
                </Field>
              </div>

              <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-3.5 text-sm ring-1", verified ? "bg-positive/10 ring-positive/40" : "ring-line", errors.verified && "ring-destructive")}>
                <input
                  type="checkbox"
                  checked={!!verified}
                  onChange={(e) => setValue("verified", e.target.checked as true, { shouldValidate: true })}
                  className="mt-0.5 size-4 accent-amber-strong"
                />
                <span className="text-ink">
                  {addedVia === "phone"
                    ? "I’ve confirmed I’m speaking to the customer (security questions or a call back to the number on file)."
                    : "I’ve checked the customer’s photo ID in person."}
                </span>
              </label>
              <FieldError errors={[errors.verified]} />
            </div>

            <DialogFooter className="mt-6 gap-2">
              <Button type="button" variant="outline-ink" size="md" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" variant="ink" size="md" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" aria-hidden />} Add payee
              </Button>
            </DialogFooter>
            <p className="mt-3 text-xs text-slate">The customer is notified straight away, and this is recorded in the audit log under your name.</p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RemovePayeeButton({ payeeId, name }: { payeeId: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setConfirm(true)} className="rounded-lg p-1.5 text-slate hover:bg-canvas hover:text-negative" aria-label={`Remove ${name}`}>
        <Trash2 className="size-4" aria-hidden />
      </button>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Remove {name}?</DialogTitle>
            <DialogDescription>The customer won’t be able to send money to them until they’re added again. Payments already sent aren’t affected.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline-ink" size="md" onClick={() => setConfirm(false)}>
              Keep payee
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const res = await removePayee(payeeId);
                setBusy(false);
                setConfirm(false);
                if (!res.ok) return toast.error(res.message);
                toast.success(res.message);
                router.refresh();
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />} Remove payee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------- login: reset, suspend */

export function LoginTools({ profileId, status, isAdmin }: { profileId: string; status: string; isAdmin: boolean }) {
  const router = useRouter();
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [confirm, setConfirm] = useState<"reset" | "suspend" | null>(null);
  const [busy, setBusy] = useState(false);
  if (!isAdmin) return <p className="text-sm text-slate">Ask an admin to reset a password or suspend a login.</p>;

  const run = async () => {
    setBusy(true);
    const res =
      confirm === "reset" ? await resetCustomerPassword(profileId) : await setCustomerStatus(profileId, status === "suspended" ? "active" : "suspended");
    setBusy(false);
    setConfirm(null);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    if (res.credentials) setCredentials(res.credentials);
    router.refresh();
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline-ink" size="md" onClick={() => setConfirm("reset")}>
          <KeyRound aria-hidden /> Reset password
        </Button>
        <Button
          type="button"
          variant="outline-ink"
          size="md"
          className={status === "suspended" ? "" : "text-negative"}
          onClick={() => (status === "suspended" ? setConfirm("suspend") : setConfirm("suspend"))}
        >
          {status === "suspended" ? <RotateCcw aria-hidden /> : <Ban aria-hidden />}
          {status === "suspended" ? "Reactivate login" : "Suspend login"}
        </Button>
      </div>
      {credentials && <CredentialsCard credentials={credentials} />}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {confirm === "reset" ? "Reset their password?" : status === "suspended" ? "Reactivate this login?" : "Suspend this login?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "reset"
                ? "Only do this after checking who you’re speaking to. Their current password stops working and a new one-time password is emailed."
                : status === "suspended"
                  ? "They’ll be able to sign in again straight away."
                  : "They’re signed out and can’t sign in until you reactivate them. Their money isn’t affected."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline-ink" size="md" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button type="button" variant="ink" size="md" onClick={run} disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {confirm === "reset" ? "Reset password" : status === "suspended" ? "Reactivate" : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------------------------------------------- messages */

export function MarkHandledButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline-ink"
      size="sm"
      className="rounded-full px-3"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await markMessageHandled(id);
        setBusy(false);
        if (!res.ok) return toast.error(res.message);
        router.refresh();
      }}
    >
      {busy && <Loader2 className="animate-spin" aria-hidden />} Mark as handled
    </Button>
  );
}

/* ---------------------------------------------------------------- waitlist */

export function EmailWaitlistButton({ product, name, count }: { product: string; name: string; count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const people = `${count} ${count === 1 ? "person" : "people"}`;

  const run = async () => {
    setBusy(true);
    const res = await emailLoanWaitlist(product);
    setBusy(false);
    setOpen(false);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    router.refresh();
  };

  return (
    <>
      <Button type="button" variant="outline-ink" size="md" onClick={() => setOpen(true)}>
        <Mail aria-hidden /> Email {people}: it’s open
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Tell the waitlist the {name.toLowerCase()} is open?</DialogTitle>
            <DialogDescription>
              {people} will get one email saying it’s open and to call or visit the branch to apply. Only do this once the loan is really
              available. It can’t be unsent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline-ink" size="md" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="ink" size="md" onClick={run} disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />} Send to {people}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
