import Link from "next/link";
import { ReviewCryptoButtons } from "@/components/admin/crypto-tools";
import { Pill, shortDate } from "@/components/admin/ui";
import { CryptoCoin } from "@/components/crypto-coin";
import { formatCrypto, networkLabel, shortAddress, type CryptoTxn } from "@/lib/crypto";
import type { AdminCryptoTxn } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

const statusPill = (t: CryptoTxn) =>
  t.status === "pending" ? (
    <Pill className="bg-amber-soft text-amber-ink">{t.kind === "deposit" ? "To check" : "To send"}</Pill>
  ) : t.status === "declined" ? (
    <Pill className="bg-negative/10 text-negative">Declined</Pill>
  ) : null;

/** Crypto deposits and withdrawals, with approve and decline on the pending ones. */
export function CryptoTxnList({ txns, canReview, showCustomer = false }: { txns: (CryptoTxn | AdminCryptoTxn)[]; canReview: boolean; showCustomer?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {txns.map((t) => {
        const customer = "customer" in t ? t.customer : null;
        const inbound = t.kind === "deposit";
        return (
          <li key={t.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 py-3.5">
            <span className="flex min-w-0 flex-1 items-start gap-3">
              <CryptoCoin asset={t.asset} className="size-9 text-base" />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {showCustomer && customer && (
                    <Link href={`/admin/customers/${customer.id}`} className="font-semibold text-ink hover:underline">
                      {customer.first_name} {customer.last_name}
                    </Link>
                  )}
                  <span className={cn("text-sm", showCustomer ? "text-slate" : "font-medium text-ink")}>{t.description}</span>
                  {statusPill(t)}
                </span>
                {t.address && (
                  <span className="block text-xs text-slate">
                    {inbound ? "To the bank’s address" : "To"} <span className="font-mono">{shortAddress(t.address)}</span>
                    {t.network ? `, ${networkLabel[t.network]}` : ""}
                    {t.tag ? `, tag ${t.tag}` : ""}
                  </span>
                )}
                {!t.address && <span className="block text-xs text-slate">Posted by staff</span>}
                {t.note && <span className="block text-xs text-slate">Note: “{t.note}”</span>}
                {t.declineReason && <span className="block text-xs text-negative">{t.declineReason}</span>}
                <span className="block text-xs text-slate">
                  {shortDate(t.date)}, ref {t.reference}
                </span>
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-3 max-sm:w-full max-sm:justify-between max-sm:pl-12">
              <span className={cn("figures font-semibold whitespace-nowrap", t.status === "declined" ? "text-slate line-through" : inbound ? "text-positive" : "text-ink")}>
                {inbound ? "+" : "−"}
                {formatCrypto(t.amount, t.asset)}
              </span>
              {t.status === "pending" && <ReviewCryptoButtons txn={t} canReview={canReview} />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
