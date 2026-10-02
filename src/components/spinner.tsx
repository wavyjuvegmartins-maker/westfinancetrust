import { cn } from "@/lib/utils";

type SpinnerProps = { className?: string; label?: string };

/** Brand spinner: a faint ring with an amber arc. Size it with `size-*`; the ring takes `currentColor`. */
export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex size-8 shrink-0", className)}>
      <svg viewBox="0 0 48 48" fill="none" className="size-full animate-spin [animation-duration:0.9s]" aria-hidden>
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
        <circle cx="24" cy="24" r="20" stroke="var(--color-amber)" strokeWidth="4" strokeLinecap="round" strokeDasharray="38 88" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Centred spinner for `loading.tsx` screens while a page fetches its data. */
export function PageLoader({ label = "Loading", className }: SpinnerProps) {
  return (
    <div className={cn("flex min-h-[50vh] flex-col items-center justify-center gap-4 text-slate", className)}>
      <Spinner className="size-10" label={label} />
      <p className="text-sm font-medium" aria-hidden>
        {label}…
      </p>
    </div>
  );
}
