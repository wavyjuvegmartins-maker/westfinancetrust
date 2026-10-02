"use client";

import { useSyncExternalStore } from "react";

// Browser-side state for installing the site as an app.
//
// Chrome, Edge and Samsung Internet fire `beforeinstallprompt` once, early in
// the page's life. We keep that event so an "Install" button can use it later.
// Safari (iPhone and iPad) has no such event: people add the app from the
// Share menu, so for them we show instructions instead.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = {
  /** Already running as the installed app. */
  standalone: boolean;
  /** The browser can show its own install dialog right now. */
  canPrompt: boolean;
  /** iPhone or iPad, where installing is done by hand from the Share menu. */
  ios: boolean;
};

const serverState: InstallState = { standalone: false, canPrompt: false, ios: false };
let state = serverState;
let deferred: InstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

function read(): InstallState {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    standalone: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
    canPrompt: deferred !== null,
    // iPadOS reports itself as a Mac, so also check for a touch screen.
    ios: /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.userAgent.includes("Macintosh") && nav.maxTouchPoints > 1),
  };
}

function update() {
  const next = read();
  if (next.standalone !== state.standalone || next.canPrompt !== state.canPrompt || next.ios !== state.ios) {
    state = next;
    listeners.forEach((l) => l());
  }
}

/** Starts listening for install events. Called once, as early as possible, from <PwaSetup>. */
export function startInstallListener() {
  if (started || typeof window === "undefined") return;
  started = true;
  // An event caught by the inline script in the root layout, before React loaded.
  const early = (window as Window & { __wftInstallPrompt?: InstallPromptEvent }).__wftInstallPrompt;
  if (early) deferred = early;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // we show our own button instead of the browser's mini banner
    deferred = event as InstallPromptEvent;
    update();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    update();
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", update);
  update();
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      startInstallListener();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => serverState,
  );
}

/** Opens the browser's install dialog. Resolves true if the person installed. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null; // each event can only be used once
  await event.prompt();
  const { outcome } = await event.userChoice;
  update();
  return outcome === "accepted";
}
