import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

const tones = {
  white: "bg-surface text-ink",
  paper: "bg-paper text-ink",
  ink: "bg-deep text-white",
} as const;

type SectionProps = React.ComponentProps<"section"> & { tone?: keyof typeof tones };

export function Section({ tone = "white", className, children, ...props }: SectionProps) {
  return (
    <section className={cn(tones[tone], "py-20 sm:py-24 lg:py-28", className)} {...props}>
      <div className="container-page">{children}</div>
    </section>
  );
}

type SectionIntroProps = {
  title: React.ReactNode;
  children?: React.ReactNode;
  id?: string;
  className?: string;
  tone?: "dark" | "light";
};

/** Heading and lede that open a section. */
export function SectionIntro({ title, children, id, className, tone = "dark" }: SectionIntroProps) {
  return (
    <Reveal className={cn("max-w-2xl", className)}>
      <h2
        id={id}
        className="text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em]"
      >
        {title}
      </h2>
      {children && (
        <p className={cn("mt-5 text-lg leading-relaxed", tone === "light" ? "text-white/75" : "text-slate")}>
          {children}
        </p>
      )}
    </Reveal>
  );
}
