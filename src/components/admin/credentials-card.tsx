"use client";

import { useState } from "react";
import { Check, Copy, MailCheck, MailWarning } from "lucide-react";
import type { Credentials } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

/** Shows a new one-time password once. It isn't stored anywhere we can show it again. */
export function CredentialsCard({ credentials }: { credentials: Credentials }) {
  return (
    <div className="rounded-2xl border border-amber/50 bg-amber-soft/60 p-5">
      <p className="flex items-start gap-2.5 text-sm font-semibold text-ink">
        {credentials.emailed ? (
          <MailCheck className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
        ) : (
          <MailWarning className="mt-0.5 size-4 shrink-0 text-amber-ink" aria-hidden />
        )}
        {credentials.emailed
          ? `Emailed to ${credentials.email}.`
          : `Not emailed: ${credentials.emailProblem ?? "email isn’t set up."} Give these to the customer securely, never over an unverified call.`}
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <CopyField label="User ID" value={credentials.userId} />
        <CopyField label="One-time password" value={credentials.password} mono />
      </dl>
      <p className="mt-4 text-xs text-slate">
        This password is shown only once and works until the customer sets their own at first login.
      </p>
    </div>
  );
}

function CopyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl bg-panel px-4 py-3 ring-1 ring-line">
      <dt className="text-xs text-slate">{label}</dt>
      <dd className="mt-1 flex items-center justify-between gap-3">
        <span className={cn("text-lg font-semibold break-all text-ink", mono && "font-mono tracking-wide")}>{value}</span>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate hover:bg-canvas hover:text-ink"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="size-4 text-positive" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
      </dd>
    </div>
  );
}
