"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleX, Clock, Phone, ShieldCheck } from "lucide-react";
import { cancelDeviceSignIn, pollDeviceApproval, type ApprovalState } from "@/app/authorize/actions";
import { Spinner } from "@/components/spinner";
import { images } from "@/lib/images";
import { site } from "@/lib/site";

const pollEveryMs = 4000;

/** Full-screen "waiting for authorization from the bank", checking for the answer every few seconds. */
export function WaitingForApproval({ device }: { device: string }) {
  const router = useRouter();
  const [state, setState] = useState<ApprovalState>({ status: "pending" });

  useEffect(() => {
    if (state.status !== "pending") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const next = await pollDeviceApproval();
        if (stopped) return;
        if (next.status === "signed_in") {
          router.replace(next.redirectTo);
          router.refresh();
          return;
        }
        if (next.status !== "pending") return setState(next);
      } catch {
        // Offline for a moment: keep waiting.
      }
      if (!stopped) timer = setTimeout(check, pollEveryMs);
    };
    timer = setTimeout(check, pollEveryMs);
    // Coming back to the tab checks straight away.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        check();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state.status, router]);

  const cancel = async () => {
    await cancelDeviceSignIn();
    router.replace("/login");
  };

  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-deep px-6 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+2rem)] text-center text-white">
      <Image src={images.logoLight.src} alt="" width={images.logoLight.width} height={images.logoLight.height} className="h-16 w-auto" priority />
      <p className="mt-4 font-heading text-lg font-semibold tracking-[-0.02em]">
        West Finance <span className="font-medium">Trust</span>
      </p>

      <div className="mt-12 w-full max-w-md" aria-live="polite">
        {state.status === "pending" ? (
          <>
            <div className="relative mx-auto flex size-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber/20 [animation-duration:2.4s] motion-reduce:hidden" />
              <span className="absolute inset-2 rounded-full bg-amber/10 ring-1 ring-amber/30" />
              <ShieldCheck className="relative size-10 text-amber" aria-hidden />
            </div>
            <h1 className="mt-8 font-heading text-[1.7rem] leading-tight font-semibold tracking-[-0.03em]">Waiting for authorization from the bank</h1>
            <p className="mt-3 leading-relaxed text-white/70">
              You’re signing in from a device we don’t recognise ({device}). To keep your money safe, our team needs to confirm it’s really you. We may
              call you on the number we have on file.
            </p>
            <p className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-white/[0.07] px-4 py-2 text-sm text-white/80 ring-1 ring-white/10">
              <Spinner className="size-4 text-amber" label="Waiting" /> Keep this page open. It continues by itself once approved.
            </p>
          </>
        ) : state.status === "denied" ? (
          <>
            <CircleX className="mx-auto size-14 text-[#ff9b8f]" aria-hidden />
            <h1 className="mt-6 font-heading text-[1.7rem] leading-tight font-semibold tracking-[-0.03em]">This device wasn’t approved</h1>
            <p className="mt-3 leading-relaxed text-white/70">
              {state.reason ? `${state.reason} ` : ""}If you were trying to sign in, call us on {site.phone} and we’ll help. If it wasn’t you, call us straight away
              so we can secure your account.
            </p>
          </>
        ) : (
          <>
            <Clock className="mx-auto size-14 text-amber" aria-hidden />
            <h1 className="mt-6 font-heading text-[1.7rem] leading-tight font-semibold tracking-[-0.03em]">
              {state.status === "missing" ? "This request has ended" : "Please log in again"}
            </h1>
            <p className="mt-3 leading-relaxed text-white/70">
              {state.status === "missing"
                ? "It was cancelled, or a newer sign-in replaced it."
                : "This request has timed out. If our team has approved your device, logging in again takes you straight through."}
            </p>
          </>
        )}
      </div>

      <div className="mt-10 flex w-full max-w-md flex-col gap-3">
        <a href={site.phoneHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber px-6 font-semibold text-deep transition-colors hover:bg-amber-strong">
          <Phone className="size-4" aria-hidden /> Call {site.phone}
        </a>
        {state.status === "pending" ? (
          <button type="button" onClick={cancel} className="h-12 rounded-full font-semibold text-white/70 ring-1 ring-white/20 transition-colors hover:bg-white/10 hover:text-white">
            Cancel sign-in
          </button>
        ) : (
          <Link
            href="/login"
            onClick={() => void cancelDeviceSignIn()}
            className="inline-flex h-12 items-center justify-center rounded-full font-semibold text-white/80 ring-1 ring-white/20 transition-colors hover:bg-white/10 hover:text-white"
          >
            Back to log in
          </Link>
        )}
      </div>
    </main>
  );
}
