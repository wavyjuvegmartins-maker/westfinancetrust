import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CountUp, ImageReveal, Reveal } from "@/components/motion";
import { Section, SectionIntro } from "@/components/section";
import { SavingsCalculator } from "@/components/home/savings-calculator";
import { images } from "@/lib/images";
import { formatRate, savingsApy } from "@/lib/rates";

export function SavingsSection() {
  return (
    <Section aria-labelledby="savings-title">
      <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <ImageReveal className="overflow-hidden rounded-3xl">
            <Image
              src={images.savingsJar.src}
              alt={images.savingsJar.alt}
              width={images.savingsJar.width}
              height={images.savingsJar.height}
              sizes="(min-width: 1024px) 460px, 90vw"
              className="aspect-[4/5] w-full object-cover"
            />
          </ImageReveal>
          <Reveal
            delay={0.55}
            y={16}
            className="absolute top-5 left-5 rounded-2xl bg-surface/95 px-4 py-3 shadow-sm backdrop-blur"
          >
            <p className="figures font-heading text-3xl font-semibold tracking-[-0.03em] text-ink">
              <CountUp value={savingsApy} suffix="%" />
            </p>
            <p className="text-sm font-medium text-slate">APY on High-Yield Savings</p>
          </Reveal>
        </div>

        <div>
          <SectionIntro id="savings-title" title="Savings that earn their keep">
            High-Yield Savings pays {formatRate(savingsApy)} APY from the first dollar, with no minimum balance and no
            monthly fee. See what that means for your money.
          </SectionIntro>
          <Reveal delay={0.1} className="mt-9">
            <SavingsCalculator />
          </Reveal>
          <ButtonLink href="/personal#savings" variant="outline-ink" size="md" className="mt-8">
            Compare savings accounts
            <ArrowRight aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
