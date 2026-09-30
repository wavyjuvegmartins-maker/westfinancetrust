"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Search, X } from "lucide-react";
import { toast } from "sonner";
import { TxnList } from "@/components/dashboard/activity";
import { categoryMeta, spendCategories, type CategoryId } from "@/components/dashboard/data";
import { cashflow, type CashflowMonth } from "@/components/dashboard/selectors";
import { useBank } from "@/components/dashboard/store";
import { Money, Panel, PanelHeader, useWidth } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/rates";
import { cn } from "@/lib/utils";

const PAGE = 40;
type Direction = "all" | "in" | "out";

export function ActivityView() {
  const { state } = useBank();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [direction, setDirection] = useState<Direction>("all");
  const [account, setAccount] = useState<string>("all");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const months = useMemo(() => cashflow(state, 6), [state]);
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.txns.filter(
      (t) =>
        (!q || t.merchant.toLowerCase().includes(q) || (t.note ?? "").toLowerCase().includes(q)) &&
        (direction === "all" || (direction === "in" ? t.amount > 0 : t.amount < 0)) &&
        (account === "all" || t.account === account) &&
        (category === "all" || t.category === category),
    );
  }, [state.txns, query, direction, account, category]);

  const shown = filtered.slice(0, limit);
  const filtersOn = query || direction !== "all" || account !== "all" || category !== "all";

  const exportCsv = () => {
    const rows = [["Date", "Description", "Category", "Account", "Amount", "Status", "Note"]];
    for (const t of filtered) {
      rows.push([
        new Date(t.date).toISOString().slice(0, 10),
        t.merchant,
        categoryMeta[t.category].label,
        state.accounts.find((a) => a.id === t.account)!.name,
        t.amount.toFixed(2),
        t.status,
        t.note ?? "",
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `west-finance-trust-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Statement downloaded", { description: `${filtered.length} transactions exported as CSV.` });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink">Activity</h1>
          <p className="mt-1 text-slate">Every payment across your accounts, newest first.</p>
        </div>
        <Button type="button" variant="outline-ink" size="md" onClick={exportCsv}>
          <Download aria-hidden /> Export CSV
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <StatTile label="Money in this month" value={thisMonth.moneyIn} previous={lastMonth.moneyIn} upIsGood />
        <StatTile label="Money out this month" value={thisMonth.moneyOut} previous={lastMonth.moneyOut} upIsGood={false} />
        <StatTile label="Net this month" value={thisMonth.moneyIn - thisMonth.moneyOut} previous={lastMonth.moneyIn - lastMonth.moneyOut} upIsGood signed />
      </div>

      <Panel aria-labelledby="cashflow-title">
        <PanelHeader id="cashflow-title" title="Money in and out">
          Last six months. Transfers between your own accounts aren’t counted.
        </PanelHeader>
        <CashflowChart months={months} />
      </Panel>

      <Panel className="px-3 sm:px-4" aria-label="Transactions">
        <div className="flex flex-col gap-3 px-1 pb-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search transactions</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate" aria-hidden />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Search by name or note"
              className="h-11 w-full rounded-xl border border-input bg-canvas pr-10 pl-10 text-[0.95rem] text-ink outline-none placeholder:text-slate/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate hover:bg-panel" aria-label="Clear search">
                <X className="size-4" aria-hidden />
              </button>
            )}
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Direction" className="flex rounded-xl bg-canvas p-1">
              {(["all", "in", "out"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={direction === d}
                  onClick={() => {
                    setDirection(d);
                    setLimit(PAGE);
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                    direction === d ? "bg-panel text-ink shadow-sm ring-1 ring-line" : "text-slate hover:text-ink",
                  )}
                >
                  {d === "all" ? "All" : d === "in" ? "Money in" : "Money out"}
                </button>
              ))}
            </div>
            <FilterSelect label="Account" value={account} onChange={(v) => setAccount(v)}>
              <option value="all">All accounts</option>
              {state.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.short}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Category" value={category} onChange={(v) => setCategory(v as CategoryId | "all")}>
              <option value="all">All categories</option>
              {spendCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
              {(["income", "interest", "transfer", "p2p"] as const).map((c) => (
                <option key={c} value={c}>
                  {categoryMeta[c].label}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 pb-2 text-sm text-slate" aria-live="polite">
          <span>
            {filtered.length} {filtered.length === 1 ? "transaction" : "transactions"}
            {filtersOn && " match"}
          </span>
          {filtersOn && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDirection("all");
                setAccount("all");
                setCategory("all");
              }}
              className="font-semibold text-ink hover:text-amber-ink"
            >
              Clear filters
            </button>
          )}
        </div>

        {shown.length ? (
          <TxnList txns={shown} showDayTotals />
        ) : (
          <div className="px-4 py-14 text-center">
            <p className="font-semibold text-ink">No transactions match</p>
            <p className="mt-1 text-sm text-slate">Try a different name, or clear the filters to see everything.</p>
          </div>
        )}

        {filtered.length > limit && (
          <div className="px-2 pt-4 pb-2">
            <Button type="button" variant="outline-ink" size="md" className="w-full" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, filtered.length - limit)} more
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 appearance-none rounded-xl border border-input bg-canvas pr-9 pl-3 text-sm font-semibold text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-slate">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

/* --------------------------------------------------------------- stat tile */

function StatTile({
  label,
  value,
  previous,
  upIsGood,
  signed = false,
}: {
  label: string;
  value: number;
  previous: number;
  upIsGood: boolean;
  signed?: boolean;
}) {
  const diff = value - previous;
  const good = diff === 0 ? true : diff > 0 === upIsGood;
  return (
    <Panel as="div">
      <p className="text-sm text-slate">{label}</p>
      <p className="mt-2 font-heading text-[1.9rem] leading-none font-semibold tracking-[-0.03em] text-ink">
        <Money value={value} sign={signed} smallCents />
      </p>
      <p className="mt-2 text-xs text-slate">
        <span className={cn("font-semibold", good ? "text-positive" : "text-negative")}>
          {diff >= 0 ? "▲" : "▼"} <Money value={Math.abs(diff)} />
        </span>{" "}
        vs last month in full
      </p>
    </Panel>
  );
}

/* ---------------------------------------------------------- cashflow chart */

const CH = 240;
const M = { top: 12, right: 8, bottom: 28, left: 48 };

function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

const series = [
  { key: "moneyIn" as const, label: "Money in", color: "var(--cat-1)" },
  { key: "moneyOut" as const, label: "Money out", color: "var(--cat-2)" },
];

function CashflowChart({ months }: { months: CashflowMonth[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...months.flatMap((m) => [m.moneyIn, m.moneyOut]), 1);
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const innerW = Math.max(width - M.left - M.right, 0);
  const innerH = CH - M.top - M.bottom;
  const band = innerW / months.length;
  const barW = Math.min(24, (band - 16) / 2);
  const y = (v: number) => M.top + innerH - (v / top) * innerH;
  const fmtTick = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `$${v}`);

  return (
    <div>
      <ul className="mb-3 flex gap-5 text-sm text-slate" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={CH} role="img" aria-label="Money in and out by month for the last six months. A table with the same figures follows.">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-line" : "stroke-line/60"} strokeWidth="1" />
                <text x={M.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate text-[11px] tabular-nums">
                  {fmtTick(t)}
                </text>
              </g>
            ))}
            {months.map((m, i) => {
              const cx = M.left + band * i + band / 2;
              const dim = hover !== null && hover !== i;
              return (
                <g key={m.key} opacity={dim ? 0.35 : 1} style={{ transition: "opacity 150ms" }}>
                  {hover === i && <rect x={M.left + band * i + 4} y={M.top} width={band - 8} height={innerH} rx="10" className="fill-canvas" />}
                  <text x={cx} y={CH - 8} textAnchor="middle" className={cn("text-[11px]", i === months.length - 1 ? "fill-ink font-semibold" : "fill-slate")}>
                    {m.label}
                  </text>
                  {/* hit target: the whole month band */}
                  <rect
                    x={M.left + band * i}
                    y={M.top}
                    width={band}
                    height={innerH + 20}
                    fill="transparent"
                    onPointerEnter={() => setHover(i)}
                    onClick={() => setHover(i)}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Columns are HTML so their grow-in animation repaints reliably; the SVG carries grid, labels and hit areas. */}
        {width > 0 && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {months.map((m, i) =>
              series.map((s, j) => {
                const v = m[s.key];
                const h = Math.max(y(0) - y(v), v > 0 ? 2 : 0);
                const cx = M.left + band * i + band / 2;
                const left = j === 0 ? cx - barW - 1 : cx + 1; // 2px gap between the pair
                return (
                  <motion.div
                    key={`${m.key}-${s.key}`}
                    className="absolute rounded-t-[4px]"
                    style={{ left, top: y(0) - h, width: barW, height: h, background: s.color, originY: 1 }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1, opacity: hover !== null && hover !== i ? 0.35 : 1 }}
                    transition={{ scaleY: { duration: 0.7, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.15 } }}
                  />
                );
              }),
            )}
          </div>
        )}

        <AnimatePresence>
          {hover !== null && width > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="pointer-events-none absolute top-0 z-10 w-44 rounded-xl bg-panel p-3 text-sm shadow-lg ring-1 ring-line"
              style={{
                left: Math.min(Math.max(M.left + band * hover + band / 2 - 88, 0), width - 176),
              }}
            >
              <p className="font-semibold text-ink">
                {new Date(new Date().getFullYear(), new Date().getMonth() - (months.length - 1 - hover), 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              {series.map((s) => (
                <p key={s.key} className="mt-1 flex items-center justify-between gap-3 text-slate">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="figures font-semibold text-ink">{formatMoney(months[hover][s.key])}</span>
                </p>
              ))}
              <p className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-slate">
                Net
                <span className="figures font-semibold text-ink">{formatMoney(months[hover].moneyIn - months[hover].moneyOut)}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <table className="sr-only">
        <caption>Money in and out by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Money in</th>
            <th scope="col">Money out</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.key}>
              <th scope="row">{m.label}</th>
              <td>{formatMoney(m.moneyIn)}</td>
              <td>{formatMoney(m.moneyOut)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

