import { CountUp, RevealGroup, RevealItem } from "@/components/motion";
import { loanProducts } from "@/lib/rates";
import { cn } from "@/lib/utils";

/** Starting APR for each upcoming loan product. */
export function LoanRates({ tone = "dark", detailed = false }: { tone?: "dark" | "light"; detailed?: boolean }) {
  const light = tone === "light";
  return (
    <RevealGroup
      as="ul"
      className={cn(
        "overflow-hidden rounded-3xl",
        light ? "bg-white/[0.04] ring-1 ring-white/10" : "bg-surface ring-1 ring-line",
      )}
    >
      {loanProducts.map((p) => (
        <RevealItem
          as="li"
          key={p.id}
          id={detailed ? p.id : undefined}
          className={cn(
            "grid grid-cols-[1fr_auto] items-center gap-6 border-b px-6 py-6 last:border-0 sm:px-8",
            light ? "border-white/10" : "border-line",
          )}
        >
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.01em]">{p.name}</h3>
            {detailed && <p className={cn("mt-1.5 leading-relaxed", light ? "text-white/70" : "text-slate")}>{p.summary}</p>}
            <p className={cn("mt-1.5 text-sm", light ? "text-white/55" : "text-slate")}>
              {p.amounts}, {p.terms}
            </p>
          </div>
          <p className="text-right">
            <span className={cn("block text-xs font-medium", light ? "text-white/55" : "text-slate")}>from</span>
            <span
              className={cn(
                "figures block font-heading text-[clamp(1.7rem,3.2vw,2.3rem)] leading-none font-semibold tracking-[-0.03em]",
                light ? "text-amber" : "text-ink",
              )}
            >
              <CountUp value={p.fromApr} suffix="%" />
            </span>
            <span className={cn("mt-1 block text-xs font-medium", light ? "text-white/55" : "text-slate")}>APR</span>
          </p>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
