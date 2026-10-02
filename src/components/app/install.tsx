"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, MonitorDown, MoreVertical, Share, ShieldCheck, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { promptInstall, useInstallState } from "@/lib/pwa";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------ instructions */

const steps = [
  {
    title: "iPhone and iPad",
    icon: Smartphone,
    lines: [
      <>Open {site.domain} in <strong>Safari</strong>.</>,
      <>Tap <Share className="inline size-4 align-[-3px]" aria-label="Share" /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</>,
      <>Tap <strong>Add</strong>.</>,
    ],
  },
  {
    title: "Android",
    icon: Smartphone,
    lines: [
      <>Open {site.domain} in <strong>Chrome</strong>.</>,
      <>Tap <MoreVertical className="inline size-4 align-[-3px]" aria-label="the menu" /> then <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</>,
    ],
  },
  {
    title: "Computer",
    icon: MonitorDown,
    lines: [<>In Chrome or Edge, click the install icon <MonitorDown className="inline size-4 align-[-3px]" aria-hidden /> at the right of the address bar.</>],
  },
];

function InstallDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <div className="flex items-center gap-3">
          <Image src="/app/icon-192.png" alt="" width={48} height={48} className="size-12 rounded-xl ring-1 ring-line" />
          <div>
            <DialogTitle className="text-lg font-semibold text-ink">Get the {site.name} app</DialogTitle>
            <DialogDescription className="mt-1 text-slate">Free, and installs straight from our website.</DialogDescription>
          </div>
        </div>

        <ol className="space-y-4">
          {steps.map((step) => (
            <li key={step.title} className="rounded-xl border border-line p-4">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <step.icon className="size-4 text-amber-ink" aria-hidden /> {step.title}
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate marker:text-slate/70">
                {step.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </li>
          ))}
        </ol>

        <p className="flex gap-2 rounded-xl bg-amber-soft p-3 text-sm leading-relaxed text-ink">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-ink" aria-hidden />
          <span>
            Only install from <strong>{site.domain}</strong>. We never send app download links by text or email.
          </span>
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Asks the browser to install, or shows how to do it by hand where it can't (Safari). */
function useInstall() {
  const install = useInstallState();
  const [helpOpen, setHelpOpen] = useState(false);
  const start = async () => {
    if (install.canPrompt) await promptInstall();
    else setHelpOpen(true);
  };
  const dialog = <InstallDialog open={helpOpen} onOpenChange={setHelpOpen} />;
  return { install, start, dialog };
}

/* ----------------------------------------------------------------- button */

/** "Get the app" link-style button, hidden inside the installed app. */
export function InstallAppButton({ className }: { className?: string }) {
  const { install, start, dialog } = useInstall();
  if (install.standalone) return null;
  return (
    <>
      <button type="button" onClick={start} className={className}>
        Get the app
      </button>
      {dialog}
    </>
  );
}

/* ----------------------------------------------------------------- banner */

const DISMISS_KEY = "wft-install-dismissed";
const DISMISS_DAYS = 30;

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Small card at the bottom of phone screens offering the app. Shows only
 * where installing is possible, never inside the app itself, and stays away
 * for a month once closed.
 */
export function InstallBanner({ className }: { className?: string }) {
  const { install, start, dialog } = useInstall();
  const [dismissed, setDismissed] = useState(true);

  // Read the saved choice after mounting and wait a moment, so the card
  // doesn't jump in while the page is still settling.
  useEffect(() => {
    if (recentlyDismissed()) return;
    const timer = window.setTimeout(() => setDismissed(false), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // storage blocked: it just shows again next visit
    }
  };

  const show = !dismissed && !install.standalone && (install.canPrompt || install.ios);

  return (
    <>
      {show && (
        <aside
          aria-label="Get the app"
          className={cn(
            "fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex items-center gap-3 rounded-2xl border border-line bg-panel p-3 shadow-[0_12px_40px_-12px_rgb(15_27_51/0.35)] duration-300 animate-in fade-in slide-in-from-bottom-4 md:hidden",
            className,
          )}
        >
          <Image src="/app/icon-192.png" alt="" width={44} height={44} className="size-11 rounded-xl ring-1 ring-line" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Get our app</p>
            <p className="text-xs leading-snug text-slate">Log in faster from your home screen.</p>
          </div>
          <Button variant="ink" size="md" className="h-9 px-4" onClick={start}>
            <Download aria-hidden /> {install.canPrompt ? "Install" : "How to"}
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate hover:bg-paper hover:text-ink"
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">Not now</span>
          </button>
        </aside>
      )}
      {dialog}
    </>
  );
}

/* -------------------------------------------------------- settings row */

/** Row for the dashboard settings page; hidden inside the installed app. */
export function InstallAppRow() {
  const { install, start, dialog } = useInstall();
  if (install.standalone) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
      <span>
        <span className="block text-sm font-semibold text-ink">Get the app</span>
        <span className="text-xs text-slate">Open online banking from your home screen</span>
      </span>
      <Button variant="outline-ink" size="md" className="h-9 px-4" onClick={start}>
        <Download aria-hidden /> Install
      </Button>
      {dialog}
    </div>
  );
}
