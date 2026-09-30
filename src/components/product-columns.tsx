import { RevealGroup, RevealItem } from "@/components/motion";
import { cn } from "@/lib/utils";

export type Product = {
  id?: string;
  name: string;
  summary: string;
  highlight: { value: string; label: string };
  facts: { term: string; detail: string }[];
  featured?: boolean;
};

/** Side-by-side account comparison. The featured product is set in ink. */
export function ProductColumns({ products }: { products: Product[] }) {
  return (
    <RevealGroup className="grid gap-5 lg:grid-cols-3" stagger={0.12}>
      {products.map((p) => (
        <RevealItem
          as="article"
          key={p.name}
          id={p.id}
          className={cn(
            "flex scroll-mt-24 flex-col rounded-3xl p-7 sm:p-8",
            p.featured ? "bg-deep text-white" : "bg-surface ring-1 ring-line",
          )}
        >
          <h3 className="text-xl font-semibold tracking-[-0.015em]">{p.name}</h3>
          <p className={cn("mt-2 leading-relaxed", p.featured ? "text-white/70" : "text-slate")}>{p.summary}</p>
          <p className="mt-7">
            <span
              className={cn(
                "figures block font-heading text-[2.6rem] leading-none font-semibold tracking-[-0.035em]",
                p.featured && "text-amber",
              )}
            >
              {p.highlight.value}
            </span>
            <span className={cn("mt-2 block text-sm", p.featured ? "text-white/60" : "text-slate")}>
              {p.highlight.label}
            </span>
          </p>
          <dl className={cn("mt-7 divide-y border-t text-sm", p.featured ? "divide-white/10 border-white/10" : "divide-line border-line")}>
            {p.facts.map((f) => (
              <div key={f.term} className="flex justify-between gap-4 py-3">
                <dt className={p.featured ? "text-white/60" : "text-slate"}>{f.term}</dt>
                <dd className="text-right font-medium">{f.detail}</dd>
              </div>
            ))}
          </dl>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
