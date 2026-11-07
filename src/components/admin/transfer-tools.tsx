"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe, Landmark, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Pill, money, shortDate } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { reviewTransfer } from "@/lib/admin/actions";
import type { AdminTransfer } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Couldn’t copy. Select it and copy it by hand.");
  }
}

const statusPill = (t: AdminTransfer) =>
  t.status === "pending" ? (
    <Pill className="bg-amber-soft text-amber-ink">To approve</Pill>
  ) : t.status === "rejected" ? (
    <Pill className="bg-negative/10 text-negative">Rejected</Pill>
  ) : (
    <Pill className="bg-positive/10 text-positive">Approved</Pill>
  );

/** Customer transfers to other banks, with approve and reject on the pending ones. */
export function TransferList({ transfers, canReview }: { transfers: AdminTransfer[]; canReview: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {transfers.map((t) => {
        const intl = t.scope === "international";
        const Icon = intl ? Globe : Landmark;
        return (
          <li key={t.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 py-3.5">
            <span className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas text-ink">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {t.customer && (
                    <Link href={`/admin/customers/${t.customer.id}`} className="font-semibold text-ink hover:underline">
                      {t.customer.first_name} {t.customer.last_name}
                    </Link>
                  )}
                  <span className="text-sm text-slate">
                    to {t.recipientName}, {t.bankName}
                    {t.bankCountry ? ` (${t.bankCountry})` : ""}
                  </span>
                  {statusPill(t)}
                  {intl && <Pill className="bg-canvas text-ink ring-1 ring-line">International</Pill>}
                </span>
                <span className="block text-xs text-slate">
                  {intl ? `SWIFT ${t.swiftCode}` : `Routing ${t.routingNumber}`}, account ••{t.accountNumber.slice(-4)}
                  {t.account ? `. From ${t.account.name} ••${t.account.account_number.slice(-4)}` : ""}
                </span>
                {t.note && <span className="block text-xs text-slate">Note: “{t.note}”</span>}
                {t.rejectReason && <span className="block text-xs text-negative">{t.rejectReason}</span>}
                <span className="block text-xs text-slate">
                  {shortDate(t.date)}
                  {t.reference ? `, ref ${t.reference}` : ""}
                  {t.reviewer && t.reviewedAt ? `. ${t.status === "rejected" ? "Rejected" : "Approved"} by ${t.reviewer.first_name} ${t.reviewer.last_name}, ${shortDate(t.reviewedAt)}` : ""}
                </span>
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-3 max-sm:w-full max-sm:justify-between max-sm:pl-12">
              <span className={cn("figures font-semibold whitespace-nowrap", t.status === "rejected" ? "text-slate line-through" : "text-ink")}>−{money(t.amount)}</span>
              {t.status === "pending" && <ReviewTransferButtons transfer={t} canReview={canReview} />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ReviewTransferButtons({ transfer: t, canReview }: { transfer: AdminTransfer; canReview: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!canReview) return null;
  const intl = t.scope === "international";

  const run = async () => {
    setBusy(true);
    const res = await reviewTransfer(t.id, mode === "approve", reason);
    setBusy(false);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    setMode(null);
    setReason("");
    router.refresh();
  };

  const details: [string, string | null][] = [
    ["Recipient", t.recipientName],
    ["Address", t.recipientAddress],
    ["Bank", t.bankName],
    ["Country", t.bankCountry],
    [intl ? "SWIFT/BIC" : "Routing number", intl ? t.swiftCode : t.routingNumber],
    [intl ? "IBAN or account" : "Account number", t.accountNumber],
  ];

  return (
    <>
      <div className="flex gap-2">
        <Button type="button" variant="ink" size="sm" className="rounded-full px-3" onClick={() => setMode("approve")}>
          <Check aria-hidden /> Approve
        </Button>
        <Button type="button" variant="outline-ink" size="sm" className="rounded-full px-3" onClick={() => setMode("reject")}>
          <X aria-hidden /> Reject
        </Button>
      </div>
      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{mode === "approve" ? `Approve ${money(t.amount)} transfer?` : "Reject this transfer?"}</DialogTitle>
            <DialogDescription>
              {mode === "approve"
                ? `Send it to the details below first, then approve. The customer is told it’s been sent${intl ? " and that international transfers take 7 days to process" : ""}.`
                : "The held money goes straight back into their account. The customer sees the reason you give."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <p className="font-heading text-2xl font-semibold text-ink">{money(t.amount)}</p>
            {t.customer && (
              <p className="mt-1 text-slate">
                From {t.customer.first_name} {t.customer.last_name}
                {t.account ? `, ${t.account.name} ••${t.account.account_number.slice(-4)}` : ""}
                {t.customer.phone ? `. Phone on file: ${t.customer.phone}` : ""}
              </p>
            )}
            <dl className="mt-3 grid gap-2">
              {details
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold text-slate">{k}</dt>
                    <dd>
                      <button type="button" onClick={() => copy(v!)} className="group flex items-start gap-1.5 text-left break-all text-ink" aria-label={`Copy ${k}`}>
                        <span className={cn(/number|SWIFT|IBAN|account/i.test(k) && "font-mono")}>{v}</span>
                        <Copy className="mt-0.5 size-3.5 shrink-0 text-slate opacity-60 group-hover:opacity-100" aria-hidden />
                      </button>
                    </dd>
                  </div>
                ))}
            </dl>
            {t.note && <p className="mt-3 text-slate">Customer’s note: “{t.note}”</p>}
          </div>
          {mode === "reject" && (
            <Field>
              <FieldLabel htmlFor={`reject-${t.id}`} className="text-ink">
                Reason the customer sees
              </FieldLabel>
              <Textarea id={`reject-${t.id}`} rows={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example, the account number doesn’t match the recipient’s name." />
              <FieldDescription>{200 - reason.length} characters left</FieldDescription>
            </Field>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline-ink" size="md" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button type="button" variant={mode === "reject" ? "destructive" : "ink"} size="md" disabled={busy || (mode === "reject" && reason.trim().length < 5)} onClick={run}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {mode === "approve" ? "Approve transfer" : "Reject and refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
