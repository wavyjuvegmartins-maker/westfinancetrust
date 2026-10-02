"use client";

import { removePushSubscription, savePushSubscription } from "@/lib/messages/actions";

// Turning push notifications on and off for this device.
// iPhone and iPad only allow them inside the installed app (iOS 16.4+).

export type PushStatus = "unsupported" | "needs-install" | "blocked" | "off" | "on";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const isIosBrowserTab = () => {
  const nav = navigator as Navigator & { standalone?: boolean };
  const ios = /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.userAgent.includes("Macintosh") && nav.maxTouchPoints > 1);
  return ios && !nav.standalone && !window.matchMedia("(display-mode: standalone)").matches;
};

async function registration() {
  // Production registers the worker on load (components/app/pwa-setup.tsx); make sure it exists either way.
  return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }));
}

export async function pushStatus(): Promise<PushStatus> {
  if (!publicKey) return "unsupported";
  if (!supported()) return isIosBrowserTab() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** Asks permission (must run from a tap) and registers this device. */
export async function enablePush(): Promise<PushStatus> {
  if (!publicKey || !supported()) return pushStatus();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  const saved = await savePushSubscription(sub.toJSON(), navigator.userAgent);
  return saved.ok ? "on" : "off";
}

export async function disablePush(): Promise<PushStatus> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await removePushSubscription(sub.endpoint);
    await sub.unsubscribe();
  }
  return "off";
}
