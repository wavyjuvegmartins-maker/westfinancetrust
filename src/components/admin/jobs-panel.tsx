"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AdminPanel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { postInterestNow, runAutopayNow } from "@/lib/admin/actions";

type LastRun = { month: string; total: number; accounts: number; postedAt: string | null } | null;

/** Interest and autopay run on their own schedule; this shows the last run and lets an admin run them now. */
export function JobsPanel({ lastInterest, isAdmin }: { lastInterest: LastRun; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"interest" | "autopay" | null>(null);
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString("en-US", { month: "long" });

  const run = async (job: "interest" | "autopay") => {
    setBusy(job);
    const res = job === "interest" ? await postInterestNow() : await runAutopayNow();
    setBusy(null);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    router.refresh();
  };

  return (
    <AdminPanel aria-labelledby="jobs-title">
      <h2 id="jobs-title" className="flex items-center gap-2 font-heading text-lg font-semibold text-ink">
        <CalendarClock className="size-5 text-amber-strong" aria-hidden /> Interest and autopay
      </h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="flex items-center gap-1.5 font-semibold text-ink">
            <Sparkles className="size-4 text-slate" aria-hidden /> Monthly interest
          </dt>
          <dd className="mt-0.5 text-slate">
            {lastInterest
              ? `${new Date(`${lastInterest.month}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}: ${lastInterest.total.toLocaleString("en-US", { style: "currency", currency: "USD" })} paid to ${lastInterest.accounts} account${lastInterest.accounts === 1 ? "" : "s"}.`
              : "Not paid yet."}{" "}
            Paid automatically at 00:05 UTC on the 1st.
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 font-semibold text-ink">
            <Repeat className="size-4 text-slate" aria-hidden /> Autopay
          </dt>
          <dd className="mt-0.5 text-slate">Bills due today are paid automatically at 09:00 UTC. Failed payments are reported to the customer.</dd>
        </div>
      </dl>
      {isAdmin && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="outline-ink" size="md" disabled={!!busy} onClick={() => run("interest")}>
            {busy === "interest" && <Loader2 className="animate-spin" aria-hidden />} Pay {lastMonth} interest now
          </Button>
          <Button type="button" variant="outline-ink" size="md" disabled={!!busy} onClick={() => run("autopay")}>
            {busy === "autopay" && <Loader2 className="animate-spin" aria-hidden />} Run today’s autopay
          </Button>
        </div>
      )}
      <p className="mt-3 text-xs text-slate">Both are safe to run more than once: nothing is ever paid twice.</p>
    </AdminPanel>
  );
}
