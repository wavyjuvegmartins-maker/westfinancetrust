"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TxnList } from "@/components/dashboard/activity";
import { MoveMoneyFlow, type MoveMode } from "@/components/dashboard/move-money";
import { useBank } from "@/components/dashboard/store";
import { Avatar, Money, Panel, PanelHeader } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Payee } from "@/components/dashboard/data";
import { formatRate } from "@/lib/rates";
import { site } from "@/lib/site";

export function MoveView() {
  const { state, run } = useBank();
  const [removing, setRemoving] = useState<Payee | null>(null);
  // Remounting the flow with a new key applies a preset from the side panels.
  const [flow, setFlow] = useState<{ key: number; mode: MoveMode; to?: string }>({ key: 0, mode: "transfer" });
  const recent = state.txns.filter((t) => ["transfer", "p2p", "bill"].includes(t.method) && t.amount < 0).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="pt-2">
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink">Move money</h1>
        <p className="mt-1 text-slate">Transfer between your accounts, send to people you know, or pay a bill.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <Panel className="lg:col-span-7" aria-label="New payment">
          <div className="mx-auto max-w-lg py-2">
            <MoveMoneyFlow key={flow.key} initialMode={flow.mode} preset={flow.to ? { to: flow.to } : undefined} />
          </div>
        </Panel>

        <div className="grid content-start gap-5 lg:col-span-5">
          <Panel aria-labelledby="accounts-title">
            <PanelHeader id="accounts-title" title="Your accounts" />
            <ul className="space-y-2">
              {state.accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
                  <span>
                    <span className="block text-sm font-semibold text-ink">{a.name}</span>
                    <span className="text-xs text-slate">
                      ••{a.mask}
                      {a.apy ? `, ${formatRate(a.apy)} APY` : ""}
                      {a.maturesOn ? `, matures ${new Date(a.maturesOn).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
                    </span>
                  </span>
                  <Money value={a.balance} className="font-heading text-lg font-semibold text-ink" />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel aria-labelledby="people-title">
            <PanelHeader id="people-title" title="People you pay">
              For your security, new payees are added by our team. Call {site.phone} or visit a branch.
            </PanelHeader>
            {!state.payees.length && (
              <p className="rounded-2xl bg-canvas px-4 py-6 text-center text-sm text-slate">
                No payees yet. Call us with their name, bank, routing number and account number and we’ll add them while you’re on the line.
              </p>
            )}
            <ul className="space-y-1">
              {state.payees.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl px-1 py-2">
                  <Avatar name={p.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                    <span className="text-xs text-slate">
                      {p.bank} ••{p.mask}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFlow({ key: Date.now(), mode: "send", to: p.id })}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:ring-amber"
                  >
                    <Send className="size-3.5" aria-hidden /> Send
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(p)}
                    className="rounded-lg p-1.5 text-slate transition-colors hover:bg-canvas hover:text-negative"
                    aria-label={`Remove ${p.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
              <DialogContent className="rounded-2xl sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl">Remove {removing?.name}?</DialogTitle>
                  <DialogDescription>
                    You won’t be able to send money to them until our team adds them again. Payments you’ve already sent aren’t affected.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline-ink" size="md" onClick={() => setRemoving(null)}>
                    Keep
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="md"
                    onClick={async () => {
                      if (!removing) return;
                      const name = removing.name;
                      setRemoving(null);
                      const result = await run({ type: "removePayee", id: removing.id });
                      if (result.ok) toast.success(`${name} removed`);
                    }}
                  >
                    Remove
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Panel>

          <Panel aria-labelledby="recent-move-title" className="px-3 sm:px-4">
            <div className="px-2">
              <PanelHeader id="recent-move-title" title="Recent transfers and payments" />
            </div>
            <TxnList txns={recent} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
