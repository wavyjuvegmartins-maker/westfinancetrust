import type { LucideIcon } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/motion";
import { cn } from "@/lib/utils";

export type Feature = { icon: LucideIcon; title: string; body: string };

/** Features separated by a top rule rather than boxed in cards. */
export function FeatureList({
  features,
  columns = 3,
  tone = "dark",
  className,
}: {
  features: Feature[];
  columns?: 2 | 3 | 4;
  tone?: "dark" | "light";
  className?: string;
}) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <RevealGroup as="ul" className={cn("grid gap-x-10 gap-y-10", cols, className)}>
      {features.map(({ icon: Icon, title, body }) => (
        <RevealItem as="li" key={title} className={cn("border-t pt-6", tone === "light" ? "border-white/15" : "border-line")}>
          <Icon className={cn("size-6", tone === "light" ? "text-amber" : "text-amber-strong")} aria-hidden />
          <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em]">{title}</h3>
          <p className={cn("mt-2 leading-relaxed", tone === "light" ? "text-white/70" : "text-slate")}>{body}</p>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
