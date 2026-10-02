"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Layers, Lock, PiggyBank, Receipt, Send, Snowflake, Wallet } from "lucide-react";
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
  // No percentage when the period started from (almost) nothing, e.g. a newly opened account.
  const pct = Math.abs(points[0].value) >= 1 ? (change / points[0].value) * 100 : null;
  const up = change >= 0;

  const pickPeriod = (p: (typeof periods)[number]) => {
    setPeriod(p);
    setScrub(null);
  };

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
    // On phones the stage runs edge to edge, straight on from the navy top bar.
    <section
      aria-labelledby="balance-title"
      className="relative overflow-hidden rounded-[1.75rem] bg-deep text-white ring-1 ring-white/5 max-lg:-mx-4 max-lg:-mt-4 max-lg:rounded-t-none max-lg:rounded-b-[2rem] max-lg:ring-0 sm:max-lg:-mx-6"
    >
      {/* the brand orbit, as quiet atmosphere */}
      <svg aria-hidden viewBox="0 0 600 300" className="pointer-events-none absolute -top-24 -right-40 hidden w-[42rem] opacity-[0.12] lg:block">
        <ellipse cx="300" cy="150" rx="280" ry="110" fill="none" stroke="#e8952b" strokeWidth="18" strokeDasharray="1150 400" strokeLinecap="round" transform="rotate(-16 300 150)" />
      </svg>

      <div className="relative px-5 pt-3 pb-6 sm:p-7">
        <div className="hidden flex-wrap items-center justify-between gap-3 lg:flex">
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

        <div className="lg:mt-6">
          <p id="balance-title" className="text-sm text-white/60">
            {shown
              ? `Balance on ${shown.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
              : filter === "all"
                ? "Total balance"
                : `${state.accounts.find((a) => a.id === filter)?.name ?? "Account"} balance`}
          </p>
          <p className="mt-1.5 font-heading text-[clamp(2.75rem,12vw,3.8rem)] leading-none font-semibold tracking-[-0.045em]">
            <AnimatedMoney value={value} duration={shown ? 0.18 : 0.7} />
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
          <p className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className={cn("inline-flex items-center gap-1 font-semibold", up ? "text-emerald-300" : "text-rose-300")}>
              {up ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
              <Money value={change} sign />
              {pct !== null && ` (${up ? "+" : ""}${pct.toFixed(1)}%)`}
            </span>
            <span className="text-white/55">{shown ? "since the start of the period" : period.label}</span>
          </p>
          <PeriodSwitch period={period} onChange={pickPeriod} className="lg:hidden" />
          </div>
        </div>

        <BalanceChart points={points} scrub={scrub} onScrub={setScrub} animationKey={`${filter}-${period.id}`} label={`${filters.find((f) => f.id === filter)?.label ?? "All accounts"} balance, ${period.label}`} />

        <div className="mt-2 hidden items-center justify-between gap-4 lg:flex">
          <PeriodSwitch period={period} onChange={pickPeriod} />
          <p className="text-xs text-white/45">Drag across the chart to see any day</p>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 border-t border-white/10 pt-5 sm:max-w-lg">
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

        <AccountTiles
          filter={filter}
          onSelect={(id) => {
            setFilter(id);
            setScrub(null);
          }}
        />
      </div>
    </section>
  );
}

type Period = (typeof periods)[number];

function PeriodSwitch({ period, onChange, className }: { period: Period; onChange: (p: Period) => void; className?: string }) {
  return (
    <div className={cn("flex shrink-0 gap-1 rounded-full bg-white/[0.06] p-1", className)} role="tablist" aria-label="Time period">
      {periods.map((p) => (
        <button
          key={p.id}
          role="tab"
          type="button"
          aria-selected={period.id === p.id}
          onClick={() => onChange(p)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            period.id === p.id ? "bg-amber text-deep" : "text-white/65 hover:text-white",
          )}
        >
          {p.id}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------- account tiles (phones) */

const accountIcon = { checking: Wallet, savings: PiggyBank, certificate: Lock };

/** Swipeable row of accounts under the quick actions; picking one switches the balance above. */
function AccountTiles({ filter, onSelect }: { filter: string; onSelect: (id: string) => void }) {
  const { state } = useBank();
  const tiles = [
    { id: "all", label: "All accounts", detail: `${state.accounts.length} accounts`, balance: totalBalance(state, "all"), icon: Layers },
    ...state.accounts.map((a) => ({
      id: a.id,
      label: a.short,
      detail: a.apy ? `${a.apy.toFixed(2)}% APY` : `••${a.mask}`,
      balance: a.balance,
      icon: accountIcon[a.type],
    })),
  ];
  return (
    <div role="tablist" aria-label="Show balance for" className="-mx-5 mt-6 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:hidden">
      {tiles.map((t) => {
        const selected = filter === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onSelect(t.id)}
            className={cn(
              "flex w-[9.75rem] shrink-0 snap-start flex-col rounded-[1.25rem] p-3.5 text-left ring-1 transition-colors",
              selected ? "bg-white text-deep ring-white" : "bg-white/[0.06] text-white ring-white/10 hover:bg-white/10",
            )}
          >
            <span className="flex items-center justify-between">
              <span className={cn("flex size-8 items-center justify-center rounded-xl", selected ? "bg-amber text-deep" : "bg-white/10 text-amber")}>
                <t.icon className="size-4" aria-hidden />
              </span>
              <span className={cn("text-[0.7rem] font-medium", selected ? "text-deep/55" : "text-white/50")}>{t.detail}</span>
            </span>
            <span className={cn("mt-4 truncate text-xs font-medium", selected ? "text-deep/70" : "text-white/65")}>{t.label}</span>
            <Money value={t.balance} className="mt-0.5 font-heading text-[1.05rem] font-semibold tracking-[-0.02em]" />
          </button>
        );
      })}
    </div>
  );
}

const desktopQuery = "(min-width: 1024px)";
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(desktopQuery);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(desktopQuery).matches,
    () => true,
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
  // A slim chart on phones keeps the quick actions and accounts on the first screen.
  const H = useIsDesktop() ? 190 : 104;
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
    <div className="relative mt-4 -mx-1 lg:mt-5">
      <div
        ref={ref}
        role="img"
        tabIndex={0}
        aria-label={`${label}. Use the left and right arrow keys to read each day.`}
        style={{ height: H }}
        className="relative cursor-crosshair touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber/70"
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
      <div className="mt-1 hidden justify-between px-1 text-[0.7rem] text-white/40 lg:flex" aria-hidden>
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
