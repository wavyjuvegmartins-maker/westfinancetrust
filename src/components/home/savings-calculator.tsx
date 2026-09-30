"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { formatMoney, formatRate, savingsApy } from "@/lib/rates";

const MIN = 500;
const MAX = 100_000;

/** Glides to each new amount instead of jumping. */
function AnimatedMoney({ value, className }: { value: number; className: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => `+${formatMoney(v)}`);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.45, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv]);
  return <motion.dd className={className}>{text}</motion.dd>;
}

/** Estimates a year of interest at the advertised APY. */
export function SavingsCalculator() {
  const [amount, setAmount] = useState(10_000);
  const yearly = (amount * savingsApy) / 100;

  return (
    <div className="rounded-3xl border border-line bg-paper p-6 sm:p-8">
      <label htmlFor="savings-amount" className="text-sm font-medium text-slate">
        If you keep this much in savings
      </label>
      <output htmlFor="savings-amount" className="figures mt-1 block font-heading text-[2.4rem] leading-tight font-semibold tracking-[-0.03em] text-ink">
        {formatMoney(amount, false)}
      </output>
      <input
        id="savings-amount"
        type="range"
        min={MIN}
        max={MAX}
        step={500}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        aria-valuetext={formatMoney(amount, false)}
        className="mt-4 h-2 w-full cursor-pointer accent-amber-strong"
      />
      <div className="figures mt-2 flex justify-between text-xs text-slate">
        <span>{formatMoney(MIN, false)}</span>
        <span>{formatMoney(MAX, false)}</span>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-6 border-t border-line pt-6">
        <div>
          <dt className="text-sm text-slate">Interest in a year</dt>
          <AnimatedMoney value={yearly} className="figures mt-1 font-heading text-2xl font-semibold tracking-[-0.02em] text-positive" />
        </div>
        <div>
          <dt className="text-sm text-slate">About each month</dt>
          <AnimatedMoney value={yearly / 12} className="figures mt-1 font-heading text-2xl font-semibold tracking-[-0.02em] text-ink" />
        </div>
      </dl>
      <p className="mt-5 text-xs leading-relaxed text-slate">
        Estimate at {formatRate(savingsApy)} APY, assuming the rate stays the same and you make no withdrawals.
      </p>
    </div>
  );
}
