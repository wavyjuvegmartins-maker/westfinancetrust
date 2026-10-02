"use client";

import { useEffect, useRef } from "react";
import { images } from "@/lib/images";
import { site } from "@/lib/site";
import { Spinner } from "@/components/spinner";

// Shortest time the splash stays up, so a fast launch doesn't flash it.
const MIN_VISIBLE_MS = 900;

/**
 * Launch screen for the installed app. CSS shows it only in standalone mode
 * (see .app-splash in globals.css), so it is on screen from the very first
 * paint, before any JavaScript runs. Once the page is ready it fades away.
 * In a normal browser tab it never shows.
 */
export function AppSplash() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || getComputedStyle(el).display === "none") return;

    let timer: number | undefined;
    const hide = () => {
      timer = window.setTimeout(() => {
        el.dataset.state = "leaving";
        el.addEventListener("transitionend", () => (el.dataset.state = "gone"), { once: true });
      }, Math.max(0, MIN_VISIBLE_MS - performance.now()));
    };

    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide, { once: true });
    return () => {
      window.removeEventListener("load", hide);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={ref} className="app-splash" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- must paint before hydration, no lazy loading */}
      <img src={images.logoLight.src} alt="" width={images.logoLight.width} height={images.logoLight.height} className="h-20 w-auto" />
      <p className="mt-5 font-heading text-xl font-semibold tracking-[-0.02em] text-white">
        West Finance <span className="font-medium">Trust</span>
      </p>
      <Spinner className="mt-10 size-9 text-white" label={`Opening ${site.name}`} />
    </div>
  );
}
