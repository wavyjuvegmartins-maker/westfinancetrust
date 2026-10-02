"use client";

import { useEffect } from "react";
import { startInstallListener } from "@/lib/pwa";

/**
 * Registers the service worker (public/sw.js) and starts listening for the
 * browser's install prompt. Production only: a service worker in development
 * caches old builds and makes hot reload confusing.
 */
export function PwaSetup() {
  useEffect(() => {
    startInstallListener();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);
  return null;
}
