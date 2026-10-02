"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { disablePush, enablePush, pushStatus, type PushStatus } from "@/lib/push/client";
import { cn } from "@/lib/utils";

const hints: Record<PushStatus, string> = {
  on: "Messages, deposits and alerts arrive on this device",
  off: "Get messages, deposits and alerts on this device",
  blocked: "Blocked in this browser’s settings. Allow notifications for this site, then come back",
  "needs-install": "On iPhone and iPad, add the app to your Home Screen first, then turn this on there",
  unsupported: "This browser can’t show notifications",
};

/** "Push notifications" switch for this device, for customers and staff alike. */
export function PushToggle({ className, onlyWhenOff = false }: { className?: string; /** Show only as a prompt, while it's off. */ onlyWhenOff?: boolean }) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushStatus().then(setStatus, () => setStatus("unsupported"));
  }, []);

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      const next = on ? await enablePush() : await disablePush();
      setStatus(next);
      if (on && next === "on") toast.success("Notifications on", { description: "You’ll get messages and alerts on this device." });
      if (on && next === "blocked") toast.error("Notifications are blocked", { description: hints.blocked });
      if (!on) toast("Notifications off for this device");
    } catch {
      toast.error("Couldn’t change notifications", { description: "Try again in a moment." });
    } finally {
      setBusy(false);
    }
  };

  const usable = status === "on" || status === "off";
  if (onlyWhenOff && status !== "off") return null;
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <span className="flex min-w-0 gap-3">
        <BellRing className="mt-0.5 size-4 shrink-0 text-amber-ink" aria-hidden />
        <span>
          <span className="block text-sm font-semibold text-ink">Push notifications</span>
          <span className="text-xs text-slate">{status ? hints[status] : "Checking this device…"}</span>
        </span>
      </span>
      {usable && (
        <Switch
          checked={status === "on"}
          disabled={busy}
          onCheckedChange={toggle}
          aria-label="Push notifications on this device"
          className="data-checked:bg-amber"
        />
      )}
    </div>
  );
}
