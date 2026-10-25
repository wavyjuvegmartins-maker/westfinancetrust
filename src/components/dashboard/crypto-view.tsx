"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, CircleAlert, CircleCheck, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CryptoCoin } from "@/components/crypto-coin";
import { inputClass } from "@/components/forms/fields";
import { useBank } from "@/components/dashboard/store";
import { Panel, PanelHeader, Pill } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { assetMeta, formatCrypto, networkLabel, shortAddress, type CryptoAsset, type CryptoTxn, type CryptoWallet } from "@/lib/crypto";
import { cryptoRequestSchema } from "@/lib/schemas";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

type Flow = { kind: "deposit" | "withdraw"; asset: CryptoAsset } | null;

const pendingTotal = (txns: CryptoTxn[], asset: CryptoAsset, kind: CryptoTxn["kind"]) =>
  txns.filter((t) => t.asset === asset && t.kind === kind && t.status === "pending").reduce((s, t) => s + t.amount, 0);

export function CryptoView() {
  const { state } = useBank();
  const [flow, setFlow] = useState<Flow>(null);
  const { wallets, txns } = state.crypto;
  const hidden = state.hideBalances;

  return (
    <div className="space-y-5">
      <div className="pt-2">
        <h1 className="font-heading text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Crypto</h1>
        <p className="mt-1 text-slate">Hold Bitcoin, Tether, USD Coin and XRP. Deposits and withdrawals are checked by our team before they go through.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:col-span-7 lg:gap-4">
          {wallets.map((w) => (
            <WalletCard key={w.asset} wallet={w} txns={txns} hidden={hidden} onFlow={setFlow} />
          ))}
        </div>

        <Panel aria-labelledby="crypto-activity-title" className="lg:col-span-5">
          <PanelHeader id="crypto-activity-title" title="Crypto activity" />
          <CryptoTxnList txns={txns} />
        </Panel>
      </div>

      <Dialog open={!!flow} onOpenChange={(o) => !o && setFlow(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-md">
          {flow?.kind === "deposit" && <DepositFlow key={flow.asset} wallet={wallets.find((w) => w.asset === flow.asset)!} onDone={() => setFlow(null)} />}
          {flow?.kind === "withdraw" && <WithdrawFlow key={flow.asset} wallet={wallets.find((w) => w.asset === flow.asset)!} onDone={() => setFlow(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------------------------------------------------- wallets */

function WalletCard({ wallet: w, txns, hidden, onFlow }: { wallet: CryptoWallet; txns: CryptoTxn[]; hidden: boolean; onFlow: (f: Flow) => void }) {
  const meta = assetMeta[w.asset];
  const incoming = pendingTotal(txns, w.asset, "deposit");
  const held = pendingTotal(txns, w.asset, "withdrawal");
  return (
    <Panel as="article" aria-label={`${meta.name} wallet`} className="flex flex-col gap-4 p-4.5 sm:p-5">
      <div className="flex items-center gap-3">
        <CryptoCoin asset={w.asset} />
        <span className="min-w-0">
          <span className="block font-semibold text-ink">{meta.name}</span>
          <span className="text-xs text-slate">{meta.symbol}</span>
        </span>
      </div>
      <div>
        <p className="figures font-heading text-2xl font-semibold tracking-[-0.02em] text-ink" aria-label={hidden ? "Hidden amount" : undefined}>
          {hidden ? `••••• ${meta.symbol}` : formatCrypto(w.balance, w.asset)}
        </p>
        {!hidden && (incoming > 0 || held > 0) && (
          <p className="mt-1 text-xs text-slate">
            {incoming > 0 && <span className="block">{formatCrypto(incoming, w.asset)} being checked</span>}
            {held > 0 && <span className="block">{formatCrypto(held, w.asset)} on hold to send</span>}
          </p>
        )}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button type="button" variant="outline-ink" size="md" className="px-3" onClick={() => onFlow({ kind: "deposit", asset: w.asset })}>
          <ArrowDownToLine aria-hidden /> Deposit
        </Button>
        <Button
          type="button"
          variant="outline-ink"
          size="md"
          className="px-3"
          disabled={w.balance <= 0}
          onClick={() => onFlow({ kind: "withdraw", asset: w.asset })}
        >
          <ArrowUpFromLine aria-hidden /> Withdraw
        </Button>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------------- history */

const statusPill = (t: CryptoTxn) => {
  if (t.status === "completed") return null;
  if (t.status === "declined") return <Pill className="bg-negative/10 text-negative">Declined</Pill>;
  return <Pill className="bg-amber-soft text-amber-ink">{t.kind === "deposit" ? "Being checked" : "On hold"}</Pill>;
};

function CryptoTxnList({ txns }: { txns: CryptoTxn[] }) {
  if (!txns.length) {
    return <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-slate">No crypto activity yet.</p>;
  }
  return (
    <ul className="-mx-1 divide-y divide-line">
      {txns.map((t) => {
        const inbound = t.kind === "deposit";
        return (
          <li key={t.id} className="flex items-start gap-3 px-1 py-3">
            <CryptoCoin asset={t.asset} className="size-9 text-base" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate text-sm font-semibold text-ink">{t.description}</span>
                {statusPill(t)}
              </span>
              {t.address && <span className="block truncate text-xs text-slate">{inbound ? "To" : "To your"} address {shortAddress(t.address)}</span>}
              {t.note && <span className="block truncate text-xs text-slate">“{t.note}”</span>}
              {t.status === "declined" && t.declineReason && <span className="block text-xs text-negative">{t.declineReason}</span>}
              <span className="block text-xs text-slate">
                {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ref {t.reference}
              </span>
            </span>
            <span
              className={cn(
                "figures shrink-0 text-sm font-semibold whitespace-nowrap",
                t.status === "declined" ? "text-slate line-through" : inbound ? "text-positive" : "text-ink",
              )}
            >
              {inbound ? "+" : "−"}
              {formatCrypto(t.amount, t.asset)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------ shared bits */

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error("Couldn’t copy. Select it and copy it by hand.");
  }
}

function AddressBox({ label, address, network, tag }: { label: string; address: string; network: keyof typeof networkLabel; tag: string | null }) {
  return (
    <div className="rounded-2xl bg-canvas p-4 text-sm">
      <p className="text-xs font-semibold tracking-wide text-slate uppercase">{label}</p>
      <p className="mt-1.5 font-mono text-[0.95rem] leading-relaxed break-all text-ink select-all">{address}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate">
          Network <span className="font-semibold text-ink">{networkLabel[network]}</span>
        </span>
        <Button type="button" variant="outline-ink" size="sm" className="rounded-full px-3" onClick={() => copy(address, "Address")}>
          <Copy aria-hidden /> Copy address
        </Button>
      </div>
      {tag && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <span className="text-slate">
            Destination tag <span className="font-mono font-semibold text-ink select-all">{tag}</span>
          </span>
          <Button type="button" variant="outline-ink" size="sm" className="rounded-full px-3" onClick={() => copy(tag, "Tag")}>
            <Copy aria-hidden /> Copy tag
          </Button>
        </div>
      )}
    </div>
  );
}

function NoAddress({ asset, side, onDone }: { asset: CryptoAsset; side: "deposit" | "withdrawal"; onDone: () => void }) {
  const symbol = assetMeta[asset].symbol;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">{side === "deposit" ? `No ${symbol} deposit address yet` : `No ${symbol} withdrawal address yet`}</DialogTitle>
        <DialogDescription>
          {side === "deposit"
            ? `For your security, our team sets up your ${symbol} deposit address. Call ${site.phone} or send us a secure message and we’ll set it up.`
            : `For your security, withdrawals only go to an address our team has checked with you. Call ${site.phone} or visit a branch with the address you want to use.`}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="mt-4">
        <Button type="button" variant="ink" size="md" onClick={onDone}>
          OK
        </Button>
      </DialogFooter>
    </>
  );
}

function Done({ title, children, onDone }: { title: string; children: React.ReactNode; onDone: () => void }) {
  return (
    <div className="text-center">
      <CircleCheck className="mx-auto size-12 text-positive" aria-hidden />
      <DialogTitle className="mt-3 font-heading text-xl">{title}</DialogTitle>
      <DialogDescription className="mt-2">{children}</DialogDescription>
      <Button type="button" variant="ink" size="md" className="mt-6 w-full" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

/** Amount and note fields, checked with the same rules as the server. */
function useRequestForm(asset: CryptoAsset) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const validate = () => {
    const parsed = cryptoRequestSchema.safeParse({ asset, amount: amount.trim() === "" ? Number.NaN : Number(amount.replace(/,/g, "")), note });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the amount.");
      return null;
    }
    setError(null);
    return parsed.data;
  };
  return { amount, setAmount, note, setNote, error, setError, validate };
}

function AmountFields({ asset, form, max }: { asset: CryptoAsset; form: ReturnType<typeof useRequestForm>; max?: number }) {
  const symbol = assetMeta[asset].symbol;
  return (
    <div className="grid gap-4">
      <Field data-invalid={!!form.error}>
        <div className="flex items-end justify-between gap-3">
          <FieldLabel htmlFor="crypto-amount" className="text-ink">
            Amount in {symbol}
          </FieldLabel>
          {max !== undefined && (
            <button type="button" className="text-sm font-semibold text-amber-ink hover:underline" onClick={() => form.setAmount(String(max))}>
              Max {formatCrypto(max, asset)}
            </button>
          )}
        </div>
        <div className="relative">
          <Input
            id="crypto-amount"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => form.setAmount(e.target.value)}
            className={cn(inputClass, "pr-16 text-lg")}
            aria-invalid={!!form.error}
          />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-semibold text-slate">{symbol}</span>
        </div>
        {form.error && <FieldError>{form.error}</FieldError>}
      </Field>
      <Field>
        <FieldLabel htmlFor="crypto-note" className="text-ink">
          Note (optional)
        </FieldLabel>
        <Input id="crypto-note" maxLength={60} autoComplete="off" value={form.note} onChange={(e) => form.setNote(e.target.value)} className={inputClass} />
      </Field>
    </div>
  );
}

/* ----------------------------------------------------------------- deposit */

function DepositFlow({ wallet, onDone }: { wallet: CryptoWallet; onDone: () => void }) {
  const { run } = useBank();
  const [step, setStep] = useState<"address" | "amount" | "done">("address");
  const [busy, setBusy] = useState(false);
  const form = useRequestForm(wallet.asset);
  const meta = assetMeta[wallet.asset];
  if (!wallet.deposit) return <NoAddress asset={wallet.asset} side="deposit" onDone={onDone} />;
  const deposit = wallet.deposit;

  if (step === "done") {
    return (
      <Done title="Thanks, we’ll check it" onDone={onDone}>
        Once our team sees the {meta.symbol} arrive, it’s added to your wallet and we’ll let you know. This usually takes a few hours on business days.
      </Done>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const request = form.validate();
    if (!request) return;
    setBusy(true);
    const result = await run({ type: "cryptoDeposit", request });
    setBusy(false);
    if (result.ok) setStep("done");
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">{step === "address" ? `Deposit ${meta.symbol}` : `How much ${meta.symbol} did you send?`}</DialogTitle>
        <DialogDescription>
          {step === "address"
            ? `Send ${meta.symbol} from your own wallet or exchange to the address below, then tell us you’ve sent it.`
            : "We’ll check it’s arrived before adding it to your wallet."}
        </DialogDescription>
      </DialogHeader>

      {step === "address" ? (
        <div className="mt-5 grid gap-3">
          <AddressBox label={`Your ${meta.symbol} deposit address`} address={deposit.address} network={deposit.network} tag={deposit.tag} />
          <p className="flex gap-2.5 rounded-2xl bg-amber-soft p-3.5 text-sm text-amber-ink">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Only send {meta.symbol} on the {networkLabel[deposit.network]} network
              {deposit.tag ? ", and always include the destination tag" : ""}. Coins sent another way can be lost for good.
            </span>
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <AmountFields asset={wallet.asset} form={form} />
          <p className="mt-3 text-xs text-slate">
            Sent to {shortAddress(deposit.address)} on {networkLabel[deposit.network]}.
          </p>
        </div>
      )}

      <DialogFooter className="mt-6 gap-2">
        <Button type="button" variant="outline-ink" size="md" onClick={() => (step === "amount" ? setStep("address") : onDone())}>
          {step === "amount" ? "Back" : "Close"}
        </Button>
        {step === "address" ? (
          <Button type="button" variant="ink" size="md" onClick={() => setStep("amount")}>
            I’ve sent it
          </Button>
        ) : (
          <Button type="submit" variant="ink" size="md" disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />} Tell the bank
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

/* ---------------------------------------------------------------- withdraw */

function WithdrawFlow({ wallet, onDone }: { wallet: CryptoWallet; onDone: () => void }) {
  const { run } = useBank();
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(0);
  const form = useRequestForm(wallet.asset);
  const meta = assetMeta[wallet.asset];
  if (!wallet.withdrawal) return <NoAddress asset={wallet.asset} side="withdrawal" onDone={onDone} />;
  const to = wallet.withdrawal;

  if (step === "done") {
    return (
      <Done title="Withdrawal requested" onDone={onDone}>
        {formatCrypto(amount, wallet.asset)} is on hold while our team sends it to your address ending {to.address.slice(-6)}. We’ll let you know when
        it’s on its way. If we can’t send it, it goes straight back into your wallet.
      </Done>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const request = form.validate();
    if (!request) return;
    if (request.amount > wallet.balance) {
      form.setError(`You have ${formatCrypto(wallet.balance, wallet.asset)}.`);
      return;
    }
    if (step === "form") {
      setAmount(request.amount);
      setStep("confirm");
      return;
    }
    setBusy(true);
    const result = await run({ type: "cryptoWithdraw", request });
    setBusy(false);
    if (result.ok) setStep("done");
    else setStep("form");
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">{step === "confirm" ? "Check and confirm" : `Withdraw ${meta.symbol}`}</DialogTitle>
        <DialogDescription>
          {step === "confirm" ? "Crypto can’t be called back once it’s sent." : `Available ${formatCrypto(wallet.balance, wallet.asset)}.`}
        </DialogDescription>
      </DialogHeader>

      {step === "form" ? (
        <div className="mt-5 grid gap-4">
          <AmountFields asset={wallet.asset} form={form} max={wallet.balance} />
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <p className="text-xs font-semibold tracking-wide text-slate uppercase">Goes to your address</p>
            <p className="mt-1.5 font-mono break-all text-ink">{to.address}</p>
            <p className="mt-1 text-slate">
              {networkLabel[to.network]}
              {to.tag ? `, tag ${to.tag}` : ""}
            </p>
            <FieldDescription className="mt-2">To use a different address, call {site.phone}. Our team checks every change with you.</FieldDescription>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-canvas p-4 text-sm">
          <p className="figures font-heading text-3xl font-semibold text-ink">{formatCrypto(amount, wallet.asset)}</p>
          <p className="mt-2 text-slate">
            To <span className="font-mono break-all text-ink">{to.address}</span>
          </p>
          <p className="mt-1 text-slate">
            On {networkLabel[to.network]}
            {to.tag ? `, destination tag ${to.tag}` : ""}
          </p>
          <p className="mt-3 text-slate">
            Left in your wallet <span className="font-semibold text-ink">{formatCrypto(Number((wallet.balance - amount).toFixed(meta.decimals)), wallet.asset)}</span>
          </p>
          <p className="mt-3 text-xs text-slate">The coins are held now. Our team sends them and confirms, usually within one business day.</p>
        </div>
      )}

      <DialogFooter className="mt-6 gap-2">
        <Button type="button" variant="outline-ink" size="md" onClick={() => (step === "confirm" ? setStep("form") : onDone())}>
          {step === "confirm" ? "Back" : "Cancel"}
        </Button>
        <Button type="submit" variant="ink" size="md" disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {step === "confirm" ? "Request withdrawal" : "Review"}
        </Button>
      </DialogFooter>
    </form>
  );
}
