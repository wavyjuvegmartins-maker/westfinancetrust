import { Check } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/motion";
import { cn } from "@/lib/utils";

export function CheckList({
  items,
  className,
  tone = "dark",
}: {
  items: readonly string[];
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <RevealGroup as="ul" className={cn("space-y-3", className)}>
      {items.map((item) => (
        <RevealItem as="li" key={item} className="flex gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
              tone === "light" ? "bg-amber/20 text-amber" : "bg-amber-soft text-amber-ink",
            )}
          >
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
          <span className={tone === "light" ? "text-white/85" : "text-ink/85"}>{item}</span>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
