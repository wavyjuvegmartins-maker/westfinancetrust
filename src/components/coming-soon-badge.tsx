import { cn } from "@/lib/utils";

export function ComingSoonBadge({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
        tone === "light" ? "bg-amber/15 text-amber" : "bg-amber-soft text-amber-ink",
        className,
      )}
    >
      <span className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-amber opacity-60 motion-reduce:hidden" />
        <span className="relative size-2 rounded-full bg-amber" />
      </span>
      Coming soon
    </span>
  );
}
