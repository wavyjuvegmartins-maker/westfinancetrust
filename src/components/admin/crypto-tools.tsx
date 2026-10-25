"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownToLine, ArrowUpFromLine, Check, Copy, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { inputClass } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clearCryptoAddress, postCrypto, reviewCrypto, setCryptoAddress } from "@/lib/admin/actions";
import { assetMeta, formatCrypto, networkLabel, type CryptoAsset, type CryptoTxn, type CryptoWallet } from "@/lib/crypto";
import { cryptoAddressSchema, cryptoPostSchema, type CryptoAddressValues, type CryptoPostValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Side = "deposit" | "withdrawal";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Couldn’t copy. Select it and copy it by hand.");
  }
}

/* ------------------------------------------------------------- addresses */

/** One address line on the customer page, with set, change and remove. */
export function CryptoAddressRow({ profileId, customerName, wallet, side }: { profileId: string; customerName: string; wallet: CryptoWallet; side: Side }) {
  const current = side === "deposit" ? wallet.deposit : wallet.withdrawal;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-slate">{side === "deposit" ? "Deposit address (they send to)" : "Withdrawal address (we send to)"}</span>
        {current ? (
          <>
            <button
              type="button"
              onClick={() => copy(current.address)}
              className="group mt-0.5 flex max-w-full items-start gap-1.5 text-left font-mono text-sm break-all text-ink"
              aria-label={`Copy ${side} address`}
            >
              {current.address}
              <Copy className="mt-0.5 size-3.5 shrink-0 text-slate opacity-60 group-hover:opacity-100" aria-hidden />
            </button>
            <span className="block text-xs text-slate">
              {networkLabel[current.network]}
              {current.tag ? `, tag ${current.tag}` : ""}
            </span>
          </>
        ) : (
          <span className="mt-0.5 block text-sm text-slate">Not set</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <CryptoAddressButton profileId={profileId} customerName={customerName} asset={wallet.asset} side={side} hasCurrent={!!current} />
        {current && <RemoveCryptoAddressButton profileId={profileId} asset={wallet.asset} side={side} />}
      </span>
    </div>
  );
}

function CryptoAddressButton({ profileId, customerName, asset, side, hasCurrent }: { profileId: string; customerName: string; asset: CryptoAsset; side: Side; hasCurrent: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = assetMeta[asset];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-slate hover:bg-canvas hover:text-ink"
        aria-label={`${hasCurrent ? "Change" : "Set"} ${meta.symbol} ${side} address`}
      >
        {hasCurrent ? <Pencil className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
          {open && <AddressForm profileId={profileId} customerName={customerName} asset={asset} side={side} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddressForm({ profileId, customerName, asset, side, onDone }: { profileId: string; customerName: string; asset: CryptoAsset; side: Side; onDone: () => void }) {
  const router = useRouter();
  const meta = assetMeta[asset];
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CryptoAddressValues>({
    resolver: zodResolver(cryptoAddressSchema),
    defaultValues: { asset, side, network: meta.networks[0], address: "", confirmAddress: "", tag: "", addedVia: "phone", verified: false },
  });
  const network = useWatch({ control, name: "network" });
  const addedVia = useWatch({ control, name: "addedVia" });
  const verified = useWatch({ control, name: "verified" });

  const onSubmit = handleSubmit(async (values) => {
    const res = await setCryptoAddress(profileId, values);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    router.refresh();
    onDone();
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">
          {meta.symbol} {side} address for {customerName}
        </DialogTitle>
        <DialogDescription>
          {side === "deposit"
            ? `The bank’s address that ${customerName} sends ${meta.symbol} to. Copy it from the bank’s wallet, don’t type it.`
            : `Where we send ${customerName}’s ${meta.symbol} withdrawals. Take it from the customer and read it back to them.`}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 grid gap-4">
        {side === "withdrawal" && (
          <fieldset>
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
            <FieldError errors={[errors.addedVia]} />
          </fieldset>
        )}

        <Field data-invalid={!!errors.network}>
          <FieldLabel className="text-ink">Network</FieldLabel>
          {meta.networks.length === 1 ? (
            <p className="text-sm text-ink">{networkLabel[meta.networks[0]]}</p>
          ) : (
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              {meta.networks.map((n) => (
                <label
                  key={n}
                  className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium ring-1", network === n ? "bg-amber-soft text-ink ring-amber" : "text-slate ring-line")}
                >
                  <input type="radio" value={n} className="accent-amber-strong" {...register("network")} />
                  {networkLabel[n]}
                </label>
              ))}
            </div>
          )}
          <FieldError errors={[errors.network]} />
        </Field>

        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="crypto-address" className="text-ink">Address</FieldLabel>
          <Input id="crypto-address" autoComplete="off" spellCheck={false} className={cn(inputClass, "font-mono text-sm")} aria-invalid={!!errors.address} {...register("address")} />
          <FieldError errors={[errors.address]} />
        </Field>

        {side === "withdrawal" && (
          <Field data-invalid={!!errors.confirmAddress}>
            <FieldLabel htmlFor="crypto-address-confirm" className="text-ink">Address again</FieldLabel>
            <Input
              id="crypto-address-confirm"
              autoComplete="off"
              spellCheck={false}
              onPaste={(e) => e.preventDefault()}
              className={cn(inputClass, "font-mono text-sm")}
              aria-invalid={!!errors.confirmAddress}
              {...register("confirmAddress")}
            />
            <FieldDescription>Typed again, not pasted, so a wrong address is caught before coins are sent to it.</FieldDescription>
            <FieldError errors={[errors.confirmAddress]} />
          </Field>
        )}

        {network === "xrpl" && (
          <Field data-invalid={!!errors.tag}>
            <FieldLabel htmlFor="crypto-tag" className="text-ink">Destination tag {side === "withdrawal" ? "(if their exchange gave one)" : ""}</FieldLabel>
            <Input id="crypto-tag" inputMode="numeric" autoComplete="off" className={cn(inputClass, "font-mono")} aria-invalid={!!errors.tag} {...register("tag")} />
            {side === "deposit" && <FieldDescription>Give each customer their own tag on a shared address, so you can tell deposits apart.</FieldDescription>}
            <FieldError errors={[errors.tag]} />
          </Field>
        )}

        {side === "withdrawal" && (
          <>
            <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-3.5 text-sm ring-1", verified ? "bg-positive/10 ring-positive/40" : "ring-line", errors.verified && "ring-destructive")}>
              <input
                type="checkbox"
                checked={!!verified}
                onChange={(e) => setValue("verified", e.target.checked, { shouldValidate: true })}
                className="mt-0.5 size-4 accent-amber-strong"
              />
              <span className="text-ink">
                {addedVia === "phone"
                  ? "I’ve confirmed I’m speaking to the customer (security questions or a call back to the number on file)."
                  : "I’ve checked the customer’s photo ID in person."}
              </span>
            </label>
            <FieldError errors={[errors.verified]} />
          </>
        )}
      </div>

      <DialogFooter className="mt-6 gap-2">
        <Button type="button" variant="outline-ink" size="md" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="ink" size="md" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />} Save address
        </Button>
      </DialogFooter>
      <p className="mt-3 text-xs text-slate">The customer is notified straight away, and this is recorded in the audit log under your name.</p>
    </form>
  );
}

function RemoveCryptoAddressButton({ profileId, asset, side }: { profileId: string; asset: CryptoAsset; side: Side }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const symbol = assetMeta[asset].symbol;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate hover:bg-canvas hover:text-negative" aria-label={`Remove ${symbol} ${side} address`}>
        <Trash2 className="size-4" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Remove the {symbol} {side} address?</DialogTitle>
            <DialogDescription>
              {side === "deposit"
                ? `The customer won’t see a ${symbol} deposit address until you set one again.`
                : `The customer can’t withdraw ${symbol} until you add an address again. Withdrawals already requested still go to the address they were made to.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline-ink" size="md" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const res = await clearCryptoAddress(profileId, asset, side);
                setBusy(false);
                setOpen(false);
                if (!res.ok) return toast.error(res.message);
                toast.success(res.message);
                router.refresh();
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />} Remove address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------------------------------------------- credit, debit now */

export function CryptoPostButtons({ profileId, wallet }: { profileId: string; wallet: CryptoWallet }) {
  const [kind, setKind] = useState<"deposit" | "withdrawal" | null>(null);
  return (
    <>
      <div className="flex gap-2">
        <Button type="button" variant="outline-ink" size="sm" className="rounded-full px-3" onClick={() => setKind("deposit")}>
          <ArrowDownToLine aria-hidden /> Credit
        </Button>
        <Button type="button" variant="outline-ink" size="sm" className="rounded-full px-3" disabled={wallet.balance <= 0} onClick={() => setKind("withdrawal")}>
          <ArrowUpFromLine aria-hidden /> Debit
        </Button>
      </div>
      <Dialog open={!!kind} onOpenChange={(o) => !o && setKind(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          {kind && <PostForm key={kind} kind={kind} profileId={profileId} wallet={wallet} onDone={() => setKind(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PostForm({ kind, profileId, wallet, onDone }: { kind: "deposit" | "withdrawal"; profileId: string; wallet: CryptoWallet; onDone: () => void }) {
  const router = useRouter();
  const meta = assetMeta[wallet.asset];
  const [step, setStep] = useState<"form" | "confirm">("form");
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CryptoPostValues>({
    resolver: zodResolver(cryptoPostSchema),
    defaultValues: { asset: wallet.asset, description: kind === "deposit" ? `${meta.symbol} deposit received` : `${meta.symbol} withdrawal` },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (step === "form") {
      if (kind === "withdrawal" && values.amount > wallet.balance) {
        toast.error(`Not enough ${meta.symbol}`, { description: `The wallet holds ${formatCrypto(wallet.balance, wallet.asset)}.` });
        return;
      }
      setStep("confirm");
      return;
    }
    const res = await postCrypto(profileId, kind, values);
    if (!res.ok) {
      toast.error(res.message);
      setStep("form");
      return;
    }
    toast.success(res.message, { description: formatCrypto(values.amount, wallet.asset) });
    router.refresh();
    onDone();
  });

  const after = () => Number((wallet.balance + (kind === "deposit" ? 1 : -1) * getValues("amount")).toFixed(meta.decimals));
  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">
          {step === "confirm" ? `Confirm ${kind === "deposit" ? "credit" : "debit"}` : `${kind === "deposit" ? "Credit" : "Debit"} ${meta.name}`}
        </DialogTitle>
        <DialogDescription>Wallet holds {formatCrypto(wallet.balance, wallet.asset)}. This goes through at once, with no approval step.</DialogDescription>
      </DialogHeader>
      {step === "form" ? (
        <div className="mt-5 grid gap-4">
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="crypto-post-amount" className="text-ink">Amount in {meta.symbol}</FieldLabel>
            <Input id="crypto-post-amount" type="number" step="any" min="0" autoFocus className={cn(inputClass, "text-lg")} aria-invalid={!!errors.amount} {...register("amount", { valueAsNumber: true })} />
            <FieldError errors={[errors.amount]} />
          </Field>
          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="crypto-post-description" className="text-ink">Description the customer sees</FieldLabel>
            <Input id="crypto-post-description" className={inputClass} aria-invalid={!!errors.description} {...register("description")} />
            <FieldError errors={[errors.description]} />
          </Field>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-canvas p-4 text-sm">
          <p className="font-heading text-3xl font-semibold text-ink">{formatCrypto(getValues("amount"), wallet.asset)}</p>
          <p className="mt-1 text-slate">{getValues("description")}</p>
          <p className="mt-3 text-slate">
            New balance <span className="font-semibold text-ink">{formatCrypto(after(), wallet.asset)}</span>
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
          {step === "confirm" ? (kind === "deposit" ? "Post credit" : "Post debit") : "Review"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ------------------------------------------------------- approve, decline */

export function ReviewCryptoButtons({ txn, canReview }: { txn: CryptoTxn; canReview: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"approve" | "decline" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!canReview) return null;
  const amount = formatCrypto(txn.amount, txn.asset);
  const deposit = txn.kind === "deposit";

  const run = async () => {
    setBusy(true);
    const res = await reviewCrypto(txn.id, mode === "approve", reason);
    setBusy(false);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    setMode(null);
    router.refresh();
  };

  return (
    <>
      <div className="flex gap-2">
        <Button type="button" variant="ink" size="sm" className="rounded-full px-3" onClick={() => setMode("approve")}>
          <Check aria-hidden /> {deposit ? "Approve" : "Mark sent"}
        </Button>
        <Button type="button" variant="outline-ink" size="sm" className="rounded-full px-3" onClick={() => setMode("decline")}>
          <X aria-hidden /> Decline
        </Button>
      </div>
      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {mode === "approve" ? (deposit ? `Approve ${amount} deposit?` : `Mark ${amount} as sent?`) : `Decline this ${txn.kind}?`}
            </DialogTitle>
            <DialogDescription>
              {mode === "approve"
                ? deposit
                  ? "Only approve once you’ve seen these coins arrive in the bank’s wallet. They’re added to the customer’s balance straight away."
                  : "Send the coins to the address below from the bank’s wallet first, then mark it as sent. The customer is told it’s on its way."
                : deposit
                  ? "Nothing is added to their wallet. Tell them why, for example the coins haven’t arrived."
                  : "The held coins go straight back into their wallet. Tell them why."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <p className="font-heading text-2xl font-semibold text-ink">{amount}</p>
            {txn.address && (
              <>
                <p className="mt-2 text-xs font-semibold text-slate">{deposit ? "Sent to the bank’s address" : "Send to"}</p>
                <button type="button" onClick={() => copy(txn.address!)} className="mt-0.5 flex items-start gap-1.5 text-left font-mono break-all text-ink" aria-label="Copy address">
                  {txn.address}
                  <Copy className="mt-0.5 size-3.5 shrink-0 text-slate" aria-hidden />
                </button>
                <p className="mt-1 text-slate">
                  {txn.network ? networkLabel[txn.network] : ""}
                  {txn.tag ? `, destination tag ${txn.tag}` : ""}
                </p>
              </>
            )}
            {txn.note && <p className="mt-2 text-slate">Customer’s note: “{txn.note}”</p>}
          </div>
          {mode === "decline" && (
            <Field>
              <FieldLabel htmlFor={`decline-${txn.id}`} className="text-ink">Reason the customer sees</FieldLabel>
              <Textarea id={`decline-${txn.id}`} rows={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline-ink" size="md" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button type="button" variant={mode === "decline" ? "destructive" : "ink"} size="md" disabled={busy} onClick={run}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {mode === "approve" ? (deposit ? "Approve deposit" : "Mark as sent") : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
