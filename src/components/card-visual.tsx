import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

/** The West Finance Trust debit card, drawn in code so it stays sharp at any size. */
export function CardVisual({
  className,
  holder = "Alex Morgan",
  last4 = "4821",
  label = "Debit",
}: {
  className?: string;
  holder?: string;
  last4?: string;
  label?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`West Finance Trust ${label.toLowerCase()} card`}
      className={cn(
        "relative aspect-[1.586] w-full overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-navy via-[#0f1b33] to-[#0a1326] p-[7%] text-white shadow-[0_30px_60px_-20px_rgba(15,27,51,0.55)] ring-1 ring-white/10",
        className,
      )}
    >
      {/* the logo's orbit, cropped by the card edge */}
      <svg aria-hidden viewBox="0 0 400 252" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <ellipse cx="300" cy="200" rx="190" ry="80" fill="none" stroke="#e8952b" strokeWidth="16" strokeLinecap="round" strokeDasharray="700 400" transform="rotate(-22 300 200)" opacity="0.95" />
      </svg>
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="font-heading text-[clamp(0.8rem,2.4vw,1.05rem)] font-semibold tracking-[-0.01em]">
            West Finance Trust
          </span>
          <span className="text-[clamp(0.65rem,1.8vw,0.8rem)] font-medium text-white/70">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="block h-[18%] min-h-7 w-[14%] min-w-10 rounded-md bg-gradient-to-br from-[#f6d9a8] to-[#c99a52] ring-1 ring-black/10" />
          <Wifi className="size-5 rotate-90 text-white/70" aria-hidden />
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="figures text-[clamp(0.85rem,2.6vw,1.1rem)] tracking-[0.18em] text-white/90">
              •••• •••• •••• {last4}
            </div>
            <div className="mt-1.5 text-[clamp(0.65rem,1.8vw,0.8rem)] text-white/60">{holder}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
