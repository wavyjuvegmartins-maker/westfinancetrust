"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowDownRight, ChevronRight, Headset, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CardVisual } from "@/components/card-visual";
import { ease } from "@/components/motion";
import { images } from "@/lib/images";
import { formatRate, lowestLoanApr } from "@/lib/rates";

const assurances = [
  { icon: UserCheck, text: "Every account verified in person" },
  { icon: ShieldCheck, text: "Two-step login as standard" },
  { icon: Headset, text: "Real people, one call away" },
];

const headline = ["Opened in person.", "Banked from anywhere."];

// One ellipse shared by the layer behind the photo and card, and the sweep in front of them.
const orbit = { cx: 300, cy: 290, rx: 282, ry: 148, transform: "rotate(-24 300 290)" };

function Orbit({ front = false }: { front?: boolean }) {
  return (
    <svg viewBox="0 0 600 560" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {front && (
        <defs>
          <clipPath id="orbit-front">
            <rect x="0" y="338" width="600" height="222" />
          </clipPath>
        </defs>
      )}
      <motion.ellipse
        {...orbit}
        fill="none"
        stroke="#e8952b"
        strokeWidth="22"
        strokeLinecap="round"
        clipPath={front ? "url(#orbit-front)" : undefined}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 0.8 }}
        transition={{ duration: 1.6, ease, delay: 0.55 }}
      />
    </svg>
  );
}

/** Enters once, then drifts gently so the composition feels live. */
function Floating({
  className,
  delay,
  drift = 7,
  children,
}: {
  className: string;
  delay: number;
  drift?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease, delay }}
      aria-hidden
    >
      <motion.div
        animate={{ y: [0, -drift, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: delay + 0.6 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease, delay },
});

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface">
      <div className="container-page pt-10 sm:pt-14 lg:pt-16">
        <motion.div {...fadeUp(0)}>
          <Link
            href="/loans"
            className="group inline-flex items-center gap-2.5 rounded-full border border-line bg-paper py-1 pr-3 pl-1 text-sm font-medium text-ink transition-colors hover:border-amber"
          >
            <span className="rounded-full bg-amber px-2.5 py-0.5 text-xs font-semibold text-deep">Soon</span>
            Loans from {formatRate(lowestLoanApr)} APR
            <ChevronRight className="size-4 text-slate transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </motion.div>

        {/* Each clause holds its own line on wide screens and rises out of its own mask. */}
        <h1 className="mt-8 text-[clamp(2.75rem,8.2vw,6.6rem)] leading-[0.94] font-semibold tracking-[-0.05em]">
          {headline.map((line, i) => (
            <span key={line} className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <motion.span
                className="block"
                initial={{ y: "108%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.95, ease, delay: 0.1 + i * 0.13 }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>
      </div>

      <div className="container-page grid items-center gap-14 pt-10 pb-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:pt-6 lg:pb-24">
        <div>
          <motion.p {...fadeUp(0.45)} className="max-w-xl text-lg leading-relaxed text-slate sm:text-xl">
            West Finance Trust opens your account face to face, then gives you online banking that never closes.
            Checking, savings and cards today, with low-rate loans on the way.
          </motion.p>

          <motion.div {...fadeUp(0.55)} className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/login" className="group">
              <LockKeyhole aria-hidden />
              Log in to online banking
            </ButtonLink>
            <ButtonLink href="#getting-started" variant="outline-ink" className="group">
              How to open an account
              <ArrowDownRight className="transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" aria-hidden />
            </ButtonLink>
          </motion.div>

          <ul className="mt-12 grid gap-4 border-t border-line pt-8 text-[0.95rem] text-slate sm:grid-cols-3 lg:grid-cols-1">
            {assurances.map(({ icon: Icon, text }, i) => (
              <motion.li key={text} {...fadeUp(0.7 + i * 0.08)} className="flex items-center gap-2.5">
                <Icon className="size-5 shrink-0 text-amber-strong" aria-hidden />
                {text}
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[36rem] lg:max-w-none">
          <div className="relative aspect-[600/560]">
            <Orbit />

            {/* the photo wipes up from below while the image settles from a slight zoom */}
            <motion.div
              className="absolute top-[3%] right-[4%] aspect-[4/5] w-[62%] overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-28px_rgba(15,27,51,0.5)]"
              initial={{ clipPath: "inset(100% 0% 0% 0% round 2rem)" }}
              animate={{ clipPath: "inset(0% 0% 0% 0% round 2rem)" }}
              transition={{ duration: 1.1, ease, delay: 0.25 }}
            >
              <motion.div
                className="relative h-full w-full"
                initial={{ scale: 1.18 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.6, ease, delay: 0.25 }}
              >
                <Image
                  src={images.mobileBankingWoman.src}
                  alt={images.mobileBankingWoman.alt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 400px, 62vw"
                  className="object-cover object-[50%_35%]"
                />
              </motion.div>
            </motion.div>

            <motion.div
              className="absolute bottom-[12%] left-0 w-[56%]"
              initial={{ opacity: 0, x: -40, y: 30, rotate: 0 }}
              animate={{ opacity: 1, x: 0, y: 0, rotate: -10 }}
              transition={{ duration: 1.1, ease, delay: 0.5 }}
              aria-hidden
            >
              <CardVisual />
            </motion.div>

            <Orbit front />

            <Floating className="absolute top-[9%] left-[1%]" delay={1.35}>
              <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-[0_18px_40px_-18px_rgba(15,27,51,0.45)] ring-1 ring-line">
                <span className="flex size-8 items-center justify-center rounded-full bg-positive/12 text-positive">
                  <ShieldCheck className="size-4" />
                </span>
                <span className="text-sm leading-tight">
                  <span className="block font-semibold text-ink">New device approved</span>
                  <span className="text-slate">Two-step check passed</span>
                </span>
              </div>
            </Floating>

            <Floating className="absolute right-0 bottom-0 w-[min(15rem,48%)]" delay={1.15} drift={9}>
              <div className="rounded-2xl bg-surface p-4 shadow-[0_22px_50px_-20px_rgba(15,27,51,0.5)] ring-1 ring-line sm:p-5">
                <p className="text-xs font-medium text-slate sm:text-sm">High-Yield Savings</p>
                <p className="figures mt-1 font-heading text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
                  $24,380.52
                </p>
                <p className="figures mt-1 text-xs font-medium text-positive sm:text-sm">+$83.12 interest this month</p>
              </div>
            </Floating>
          </div>
        </div>
      </div>
    </section>
  );
}
