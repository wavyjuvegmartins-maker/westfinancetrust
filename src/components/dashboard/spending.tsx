"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { spendCategories, type SpendCategory } from "@/components/dashboard/data";
import { lastMonthToDate, monthSpend } from "@/components/dashboard/selectors";
import { useBank } from "@/components/dashboard/store";
import { AnimatedMoney, Money, Panel, PanelHeader } from "@/components/dashboard/ui";
import { formatMoney } from "@/lib/rates";
import { cn } from "@/lib/utils";

export function SpendingBreakdown({ className }: { className?: string }) {
  const { state } = useBank();
  const [hovered, setHovered] = useState<SpendCategory | null>(null);
  const { total, byCat } = monthSpend(state, 0);
  const lastMtd = lastMonthToDate(state);
  const diff = total - lastMtd;
  const month = new Date().toLocaleDateString("en-US", { month: "long" });

  // Bar keeps the fixed category order (colour follows the category); the list ranks by amount.
  const segments = spendCategories.map((c) => ({ ...c, value: byCat[c.id] })).filter((c) => c.value > 0);
  const ranked = [...segments].sort((a, b) => b.value - a.value);
  const focus = hovered ? segments.find((s) => s.id === hovered) : null;

  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const used = total / state.monthlyBudget;
  const over = used > 1;

  return (
    <Panel className={className} aria-labelledby="spending-title">
      <PanelHeader id="spending-title" title={`Spending in ${month}`}>
        Card payments and bills, excluding transfers between your accounts
      </PanelHeader>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="font-heading text-[2.2rem] leading-none font-semibold tracking-[-0.03em] text-ink">
          <AnimatedMoney value={total} />
        </p>
        <p className="flex items-center gap-1 text-sm text-slate">
          {diff <= 0 ? (
            <ArrowDownRight className="size-4 text-positive" aria-hidden />
          ) : (
            <ArrowUpRight className="size-4 text-negative" aria-hidden />
          )}
          <Money value={Math.abs(diff)} className="font-semibold text-ink" />
          {diff <= 0 ? " less" : " more"} than this time last month
        </p>
      </div>

      {/* stacked part-to-whole bar */}
      <div className="relative mt-6">
        <div className="h-6">
          <AnimatePresence mode="wait">
            {focus && (
              <motion.p
                key={focus.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-sm text-ink"
              >
                <span className="font-semibold">{focus.label}</span> {formatMoney(focus.value)}{" "}
                <span className="text-slate">({Math.round((focus.value / total) * 100)}%)</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <div className="flex h-3.5 gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label={`Spending split by category, ${formatMoney(total)} in total`}>
          {segments.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1, opacity: hovered && hovered !== s.id ? 0.3 : 1 }}
              transition={{ scaleX: { duration: 0.7, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.15 } }}
              style={{ width: `${(s.value / total) * 100}%`, background: s.color, originX: 0 }}
              className="h-full min-w-[3px]"
              onPointerEnter={() => setHovered(s.id)}
              onPointerLeave={() => setHovered(null)}
            />
          ))}
        </div>
      </div>

      <ul className="mt-5 grid">
        {ranked.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onPointerEnter={() => setHovered(s.id)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(s.id)}
              onBlur={() => setHovered(null)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors",
                hovered === s.id && "bg-canvas",
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="flex-1 text-ink">{s.label}</span>
              <Money value={s.value} className="font-semibold text-ink" />
              <span className="figures w-9 text-right text-xs text-slate">{Math.round((s.value / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>

      {/* budget meter */}
      <div className="mt-5 rounded-2xl bg-canvas p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">Monthly budget</span>
          <span className="text-slate">
            <Money value={total} className="font-semibold text-ink" /> of <Money value={state.monthlyBudget} always />
          </span>
        </div>
        <div className={cn("mt-3 h-2 overflow-hidden rounded-full", over ? "bg-negative/15" : "bg-amber/20")}>
          <motion.div
            className={cn("h-full rounded-full", over ? "bg-negative" : "bg-amber")}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(used, 1) * 100}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="mt-2 text-xs text-slate">
          {over ? (
            <>
              <Money value={total - state.monthlyBudget} className="font-semibold text-negative" /> over budget with {daysLeft} {daysLeft === 1 ? "day" : "days"} to go.
            </>
          ) : (
            <>
              <Money value={state.monthlyBudget - total} className="font-semibold text-ink" /> left for the next {daysLeft} {daysLeft === 1 ? "day" : "days"}.
            </>
          )}
        </p>
      </div>
    </Panel>
  );
}
