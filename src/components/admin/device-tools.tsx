"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { approveDevice, denyDevice, removeKnownDevice } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

type Request = { id: string; device: string; ip: string | null; customerName: string; phone: string | null };

/** Approve or deny a sign-in waiting on a new device. Approving needs the admin to have checked with the customer. */
export function DeviceDecisionButtons({ request }: { request: Request }) {
  const router = useRouter();
  const [mode, setMode] = useState<"approve" | "deny" | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setMode(null);
    setConfirmed(false);
    setReason("");
  };

  const run = async () => {
    setBusy(true);
    const res = mode === "approve" ? await approveDevice(request.id) : await denyDevice(request.id, reason);
    setBusy(false);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    close();
    router.refresh();
  };

  return (
    <>
      <div className="flex gap-2">
        <Button type="button" variant="ink" size="sm" className="rounded-full px-3" onClick={() => setMode("approve")}>
          <Check aria-hidden /> Approve
        </Button>
        <Button type="button" variant="outline-ink" size="sm" className="rounded-full px-3" onClick={() => setMode("deny")}>
          <X aria-hidden /> Deny
        </Button>
      </div>
      <Dialog open={!!mode} onOpenChange={(o) => !o && close()}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {mode === "approve" ? `Approve ${request.customerName}’s new device?` : `Deny this sign-in?`}
            </DialogTitle>
            <DialogDescription>
              {mode === "approve"
                ? "They’re signed in on it straight away, and it won’t need approval again."
                : "The waiting screen tells them it wasn’t approved, and they get a security alert."}
            </DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-2xl bg-canvas p-4 text-sm">
            <dt className="text-slate">Device</dt>
            <dd className="font-medium text-ink">{request.device}</dd>
            <dt className="text-slate">IP address</dt>
            <dd className="font-mono text-ink">{request.ip ?? "Unknown"}</dd>
            <dt className="text-slate">Phone on file</dt>
            <dd className="font-medium text-ink">{request.phone || "None"}</dd>
          </dl>
          {mode === "approve" ? (
            <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-3.5 text-sm ring-1", confirmed ? "bg-positive/10 ring-positive/40" : "ring-line")}>
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-amber-strong" />
              <span className="text-ink">
                I called {request.customerName} on the number on file (not a number given by the caller) and they confirmed they’re signing in on
                this device right now.
              </span>
            </label>
          ) : (
            <Field>
              <FieldLabel htmlFor={`deny-${request.id}`} className="text-ink">Reason the customer sees (optional)</FieldLabel>
              <Textarea id={`deny-${request.id}`} rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
              <FieldDescription>For example: We couldn’t reach you to confirm it was you.</FieldDescription>
            </Field>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline-ink" size="md" onClick={close}>
              Cancel
            </Button>
            <Button type="button" variant={mode === "deny" ? "destructive" : "ink"} size="md" disabled={busy || (mode === "approve" && !confirmed)} onClick={run}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {mode === "approve" ? "Approve device" : "Deny sign-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RemoveDeviceButton({ profileId, deviceHash, device }: { profileId: string; deviceHash: string; device: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate hover:bg-canvas hover:text-negative" aria-label={`Remove ${device}`}>
        <Trash2 className="size-4" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Remove {device}?</DialogTitle>
            <DialogDescription>
              Its next sign-in needs approval again (unless it’s on an IP address another of their devices uses). If they’re signed in on it now, that
              session carries on until they log out. To end it at once, suspend the login.
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
                const res = await removeKnownDevice(profileId, deviceHash);
                setBusy(false);
                setOpen(false);
                if (!res.ok) return toast.error(res.message);
                toast.success(res.message);
                router.refresh();
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />} Remove device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
