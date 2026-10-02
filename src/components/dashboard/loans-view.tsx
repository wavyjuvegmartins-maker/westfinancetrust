"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { useBank } from "@/components/dashboard/store";
import { AnimatedMoney, Panel, PanelHeader, Pill } from "@/components/dashboard/ui";
import { formatMoney, formatRate, loanProducts, lowestLoanApr, ratesNote, type LoanProduct } from "@/lib/rates";
import { cn } from "@/lib/utils";

// Estimator ranges per product (months for terms).
const ranges: Record<LoanProduct["id"], { min: number; max: number; step: number; start: number; terms: number[] }> = {
  personal: { min: 2000, max: 50000, step: 500, start: 12000, terms: [12, 24, 36, 48, 60] },
  auto: { min: 5000, max: 100000, step: 1000, start: 28000, terms: [24, 36, 48, 60, 72] },
  home: { min: 100000, max: 1500000, step: 10000, start: 420000, terms: [180, 360] },
  business: { min: 10000, max: 500000, step: 5000, start: 75000, terms: [12, 36, 60, 84, 120] },
};

const monthlyPayment = (principal: number, apr: number, months: number) => {
  const r = apr / 100 / 12;
  return r === 0 ? principal / months : (principal * r) / (1 - (1 + r) ** -months);
};

const termLabel = (m: number) => (m >= 120 && m % 12 === 0 ? `${m / 12} years` : `${m} months`);

export function LoansView() {
  const { state, dispatch } = useBank();
  const [productId, setProductId] = useState<LoanProduct["id"]>("personal");
  const product = loanProducts.find((p) => p.id === productId)!;
  const range = ranges[productId];
  const [amount, setAmount] = useState(range.start);
  const [term, setTerm] = useState(range.terms[Math.floor(range.terms.length / 2)]);

  const pick = (id: LoanProduct["id"]) => {
    setProductId(id);
    setAmount(ranges[id].start);
    setTerm(ranges[id].terms[Math.floor(ranges[id].terms.length / 2)]);
  };

  const payment = monthlyPayment(amount, product.fromApr, term);
  const totalInterest = payment * term - amount;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-deep p-6 text-white sm:p-10" aria-labelledby="loans-title">
        <svg aria-hidden viewBox="0 0 600 300" className="pointer-events-none absolute -right-32 -bottom-24 w-[40rem] opacity-60">
          <motion.ellipse cx="300" cy="150" rx="270" ry="105" fill="none" stroke="#e8952b" strokeWidth="14" strokeLinecap="round" transform="rotate(-16 300 150)" initial={{ pathLength: 0 }} animate={{ pathLength: 0.78 }} transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }} />
        </svg>
        <div className="relative max-w-xl">
          <Pill className="bg-amber/15 text-amber">
            <span className="size-1.5 animate-pulse rounded-full bg-amber" /> Coming soon
          </Pill>
          <h1 id="loans-title" className="mt-4 font-heading text-[clamp(2rem,4vw,2.8rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
            Loans from {formatRate(lowestLoanApr)} APR are almost here
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            Fixed rates, plain terms and no fee for paying early. As a customer you’ll be first to apply, right here in online banking.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <Panel className="lg:col-span-7" aria-labelledby="estimate-title">
          <PanelHeader id="estimate-title" title="Estimate your payments">
            At our starting rates. Your actual rate will depend on your circumstances.
          </PanelHeader>

          <div role="tablist" aria-label="Loan type" className="flex flex-wrap gap-2">
            {loanProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === productId}
                onClick={() => pick(p.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-colors",
                  p.id === productId ? "bg-ink text-surface ring-ink" : "text-ink ring-line hover:ring-ink/40",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div className="space-y-7">
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="loan-amount" className="text-sm font-semibold text-ink">
                    Amount
                  </label>
                  <span className="figures font-heading text-xl font-semibold text-ink">{formatMoney(amount, false)}</span>
                </div>
                <input
                  id="loan-amount"
                  type="range"
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  aria-valuetext={formatMoney(amount, false)}
                  className="mt-3 w-full cursor-pointer accent-amber-strong"
                />
                <div className="figures mt-1 flex justify-between text-xs text-slate">
                  <span>{formatMoney(range.min, false)}</span>
                  <span>{formatMoney(range.max, false)}</span>
                </div>
              </div>
              <fieldset>
                <legend className="text-sm font-semibold text-ink">Term</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {range.terms.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={term === t}
                      onClick={() => setTerm(t)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition-colors",
                        term === t ? "bg-amber-soft text-ink ring-amber" : "text-slate ring-line hover:text-ink",
                      )}
                    >
                      {termLabel(t)}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex flex-col justify-between rounded-2xl bg-canvas p-5">
              <div>
                <p className="text-sm text-slate">Estimated monthly payment</p>
                <p className="mt-1 font-heading text-[2.6rem] leading-none font-semibold tracking-[-0.035em] text-ink">
                  <AnimatedMoney value={payment} duration={0.35} />
                </p>
                <p className="mt-2 text-sm text-slate">at {formatRate(product.fromApr)} APR for {termLabel(term)}</p>
              </div>
              <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate">Total interest</dt>
                  <dd className="figures font-semibold text-ink">{formatMoney(totalInterest)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate">Total repaid</dt>
                  <dd className="figures font-semibold text-ink">{formatMoney(payment * term)}</dd>
                </div>
              </dl>
            </div>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-slate">{ratesNote} Estimates are for illustration only. Loans are not yet available and will be subject to approval.</p>
        </Panel>

        <Panel className="lg:col-span-5" aria-labelledby="waitlist-title">
          <PanelHeader id="waitlist-title" title="Get told first">
            Choose the loans you’re interested in. No credit check, no commitment.
          </PanelHeader>
          <ul className="space-y-2">
            {loanProducts.map((p) => {
              const joined = state.loanWaitlist.includes(p.id);
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{p.name}</span>
                    <span className="text-xs text-slate">
                      From <span className="figures font-semibold text-ink">{formatRate(p.fromApr)}</span> APR, {p.amounts}
                    </span>
                  </span>
                  <AnimatePresence mode="wait" initial={false}>
                    {joined ? (
                      <motion.span key="on" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1 text-sm font-semibold text-positive">
                        <Check className="size-4" aria-hidden /> On the list
                      </motion.span>
                    ) : (
                      <motion.button
                        key="off"
                        type="button"
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          dispatch({ type: "joinWaitlist", product: p.id });
                          toast.success(`${p.name}: you’re on the list`, { description: "We’ll message you here the day applications open." });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-surface hover:bg-ink/85"
                      >
                        <BellRing className="size-3.5" aria-hidden /> Notify me
                      </motion.button>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
