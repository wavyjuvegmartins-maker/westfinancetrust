"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Receipt, Send, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { useMoveMoney } from "@/components/dashboard/move-money";
import { balanceSeries, totalBalance, type Point } from "@/components/dashboard/selectors";
import { useBank } from "@/components/dashboard/store";
import { AnimatedMoney, Money, useWidth } from "@/components/dashboard/ui";
import { formatMoney } from "@/lib/rates";
import { cn } from "@/lib/utils";

const periods = [
  { id: "1W", days: 7, label: "past week" },
  { id: "1M", days: 30, label: "past 30 days" },
  { id: "3M", days: 90, label: "past 3 months" },
] as const;

export function BalanceHero() {
  const { state, dispatch } = useBank();
  const move = useMoveMoney();
  const filters = [{ id: "all", label: "All accounts" }, ...state.accounts.map((a) => ({ id: a.id, label: a.short }))];
  const [filter, setFilter] = useState<string>("all");
  const [period, setPeriod] = useState<(typeof periods)[number]>(periods[1]);
  const [scrub, setScrub] = useState<number | null>(null);

  const points = useMemo(() => balanceSeries(state, filter, period.days), [state, filter, period.days]);
  const current = totalBalance(state, filter);
  const shown = scrub !== null ? points[scrub] : null;
  const value = shown ? shown.value : current;
  const change = value - points[0].value;
  const pct = points[0].value ? (change / points[0].value) * 100 : 0;
  const up = change >= 0;

  const card = state.card;
  const actions: { label: string; icon: typeof Send; run: () => void; active?: boolean }[] = [
    { label: "Transfer", icon: ArrowLeftRight, run: () => move.open("transfer") },
    { label: "Send", icon: Send, run: () => move.open("send") },
    { label: "Pay a bill", icon: Receipt, run: () => move.open("bill") },
  ];
  if (card) {
    actions.push({
      label: card.frozen ? "Unfreeze" : "Freeze card",
      icon: Snowflake,
      active: card.frozen,
      run: () => {
        dispatch({ type: "card", patch: { frozen: !card.frozen } });
        toast(card.frozen ? "Card unfrozen" : "Card frozen", {
          description: card.frozen ? "Your card works again." : "New card payments will be declined until you unfreeze it.",
        });
      },
    });
  }

  return (
    <section aria-labelledby="balance-title" className="relative overflow-hidden rounded-[1.75rem] bg-deep text-white ring-1 ring-white/5">
      {/* the brand orbit, as quiet atmosphere */}
      <svg aria-hidden viewBox="0 0 600 300" className="pointer-events-none absolute -top-24 -right-40 w-[42rem] opacity-[0.12]">
        <ellipse cx="300" cy="150" rx="280" ry="110" fill="none" stroke="#e8952b" strokeWidth="18" strokeDasharray="1150 400" strokeLinecap="round" transform="rotate(-16 300 150)" />
      </svg>

      <div className="relative p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Show balance for" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {filters.map((f) => (
              <button
                key={f.id}
                role="tab"
                type="button"
                aria-selected={filter === f.id}
                onClick={() => {
                  setFilter(f.id);
                  setScrub(null);
                }}
                className={cn(
                  "relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  filter === f.id ? "text-deep" : "text-white/65 hover:text-white",
                )}
              >
                {filter === f.id && (
                  <motion.span layoutId="balance-filter" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />
                )}
                <span className="relative">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p id="balance-title" className="text-sm text-white/60">
            {shown
              ? `Balance on ${shown.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
              : filter === "all"
                ? "Total balance"
                : `${state.accounts.find((a) => a.id === filter)?.name ?? "Account"} balance`}
          </p>
          <p className="mt-1 font-heading text-[clamp(2.6rem,6vw,3.8rem)] leading-none font-semibold tracking-[-0.04em]">
            <AnimatedMoney value={value} duration={shown ? 0.18 : 0.7} />
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm">
            <span className={cn("inline-flex items-center gap-1 font-semibold", up ? "text-emerald-300" : "text-rose-300")}>
              {up ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
              <Money value={change} sign /> ({up ? "+" : ""}
              {pct.toFixed(1)}%)
            </span>
            <span className="text-white/55">{shown ? "since the start of the period" : period.label}</span>
          </p>
        </div>

        <BalanceChart points={points} scrub={scrub} onScrub={setScrub} animationKey={`${filter}-${period.id}`} label={`${filters.find((f) => f.id === filter)?.label ?? "All accounts"} balance, ${period.label}`} />

        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="flex gap-1 rounded-full bg-white/[0.06] p-1" role="tablist" aria-label="Time period">
            {periods.map((p) => (
              <button
                key={p.id}
                role="tab"
                type="button"
                aria-selected={period.id === p.id}
                onClick={() => {
                  setPeriod(p);
                  setScrub(null);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  period.id === p.id ? "bg-amber text-deep" : "text-white/65 hover:text-white",
                )}
              >
                {p.id}
              </button>
            ))}
          </div>
          <p className="hidden text-xs text-white/45 sm:block">Drag across the chart to see any day</p>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2 border-t border-white/10 pt-5 sm:max-w-lg">
          {actions.map((a) => (
            <motion.button
              key={a.label}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={a.run}
              aria-pressed={a.active}
              className="group flex flex-col items-center gap-2 text-center text-xs font-medium text-white/80 hover:text-white"
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-2xl ring-1 transition-colors",
                  a.active ? "bg-[#bcd7f5]/20 text-[#bcd7f5] ring-[#bcd7f5]/40" : "bg-white/[0.07] ring-white/10 group-hover:bg-white/[0.12]",
                )}
              >
                <a.icon className="size-5" aria-hidden />
              </span>
              {a.label}
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- the chart */

/** Catmull-Rom through the points, as cubic Béziers: smooth without overshooting much. */
function smoothPath(xy: [number, number][]) {
  if (xy.length < 2) return "";
  let d = `M${xy[0][0]},${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const [x0, y0] = xy[Math.max(i - 1, 0)];
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[i + 1];
    const [x3, y3] = xy[Math.min(i + 2, xy.length - 1)];
    const t = 0.18;
    d += ` C${x1 + (x2 - x0) * t},${y1 + (y2 - y0) * t} ${x2 - (x3 - x1) * t},${y2 - (y3 - y1) * t} ${x2},${y2}`;
  }
  return d;
}

const H = 190;
const PAD_T = 18;
const PAD_B = 10;

function BalanceChart({
  points,
  scrub,
  onScrub,
  animationKey,
  label,
}: {
  points: Point[];
  scrub: number | null;
  onScrub: (i: number | null) => void;
  animationKey: string;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const gradientId = useId();
  const n = points.length;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const lo = min - span * 0.25;
  const hi = max + span * 0.12;
  const x = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * width);
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B);

  const xy = points.map((p, i) => [x(i), y(p.value)] as [number, number]);
  const line = smoothPath(xy);
  const area = `${line} L${width},${H} L0,${H} Z`;

  const indexAt = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const f = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
    return Math.round(f * (n - 1));
  };

  const s = scrub !== null ? { x: x(scrub), y: y(points[scrub].value), p: points[scrub] } : null;
  const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="relative mt-5 -mx-1">
      <div
        ref={ref}
        role="img"
        tabIndex={0}
        aria-label={`${label}. Use the left and right arrow keys to read each day.`}
        className="relative h-[190px] cursor-crosshair touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber/70"
        onPointerMove={(e) => onScrub(indexAt(e.clientX, e.currentTarget))}
        onPointerDown={(e) => onScrub(indexAt(e.clientX, e.currentTarget))}
        onPointerLeave={() => onScrub(null)}
        onBlur={() => onScrub(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const base = scrub ?? n - 1;
            onScrub(Math.min(Math.max(base + (e.key === "ArrowRight" ? 1 : -1), 0), n - 1));
          }
          if (e.key === "Escape") onScrub(null);
        }}
      >
        {width > 0 && (
          <svg width={width} height={H} className="absolute inset-0 overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e8952b" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#e8952b" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* hairline baseline grid: three recessive guides */}
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1="0" x2={width} y1={PAD_T + f * (H - PAD_T - PAD_B)} y2={PAD_T + f * (H - PAD_T - PAD_B)} stroke="white" strokeOpacity="0.06" />
            ))}
            <motion.path
              key={`a-${animationKey}`}
              d={area}
              fill={`url(#${gradientId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            <motion.path
              key={`l-${animationKey}`}
              d={line}
              fill="none"
              stroke="#e8952b"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
            {!s && (
              <motion.circle
                key={`e-${animationKey}`}
                cx={xy[n - 1][0]}
                cy={xy[n - 1][1]}
                r="5"
                fill="#e8952b"
                stroke="#0f1b33"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: "spring", bounce: 0.5 }}
              />
            )}
            {!s && (
              <circle cx={xy[n - 1][0]} cy={xy[n - 1][1]} r="5" fill="none" stroke="#e8952b" className="origin-center animate-ping [transform-box:fill-box]" />
            )}
            {s && (
              <g>
                <line x1={s.x} x2={s.x} y1={0} y2={H} stroke="white" strokeOpacity="0.35" strokeWidth="1" />
                <circle cx={s.x} cy={s.y} r="5.5" fill="#e8952b" stroke="#0f1b33" strokeWidth="2" />
              </g>
            )}
          </svg>
        )}
        {s && (
          <span
            className="pointer-events-none absolute -top-1 -translate-x-1/2 rounded-md bg-white px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap text-deep shadow"
            style={{ left: Math.min(Math.max(s.x, 32), width - 32) }}
          >
            {fmtDay(s.p.date)}
          </span>
        )}
      </div>
      <div className="mt-1 flex justify-between px-1 text-[0.7rem] text-white/40" aria-hidden>
        <span>{fmtDay(points[0].date)}</span>
        <span>{fmtDay(points[Math.floor((n - 1) / 2)].date)}</span>
        <span>Today</span>
      </div>
      {/* table view for assistive tech */}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {points.filter((_, i) => i % Math.max(1, Math.floor(n / 10)) === 0 || i === n - 1).map((p) => (
            <tr key={p.date.toISOString()}>
              <th scope="row">{fmtDay(p.date)}</th>
              <td>{formatMoney(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
