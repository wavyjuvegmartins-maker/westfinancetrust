"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { categoryMeta, spendCategories, type CategoryId } from "@/components/dashboard/data";
import { useBank } from "@/components/dashboard/store";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ money */

const splitMoney = (value: number) => {
  const abs = Math.abs(value);
  const [whole, cents] = abs.toFixed(2).split(".");
  return { whole: Number(whole).toLocaleString("en-US"), cents };
};

/**
 * A dollar amount with smaller cents, the way banking apps show balances.
 * Respects the "hide balances" privacy toggle unless `always` is set.
 */
export function Money({
  value,
  className,
  centsClassName,
  sign = false,
  always = false,
  smallCents = false,
}: {
  value: number;
  className?: string;
  centsClassName?: string;
  sign?: boolean;
  always?: boolean;
  /** Shrink the cents, for large standalone figures only. */
  smallCents?: boolean;
}) {
  const { state } = useBank();
  const hidden = state.hideBalances && !always;
  const { whole, cents } = splitMoney(value);
  const prefix = value < 0 ? "−" : sign && value > 0 ? "+" : "";
  if (hidden) {
    return (
      <span className={cn("figures", className)} aria-label="Hidden amount">
        {prefix}$•••••
      </span>
    );
  }
  return (
    <span className={cn("figures whitespace-nowrap", className)}>
      {prefix}${whole}
      {smallCents ? <span className={cn("text-[0.62em] align-[0.28em] opacity-80", centsClassName)}>.{cents}</span> : `.${cents}`}
    </span>
  );
}

/** Glides between values, e.g. when a transfer lands or the chart is scrubbed. */
export function AnimatedMoney({
  value,
  className,
  centsClassName,
  duration = 0.6,
}: {
  value: number;
  className?: string;
  centsClassName?: string;
  duration?: number;
}) {
  const { state } = useBank();
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const whole = useTransform(mv, (v) => `$${Math.floor(Math.abs(v)).toLocaleString("en-US")}`);
  const cents = useTransform(mv, (v) => `.${Math.abs(v).toFixed(2).split(".")[1]}`);

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, duration, mv, reduce]);

  if (state.hideBalances) {
    return <span className={cn("figures", className)} aria-label="Hidden amount">$•••••</span>;
  }
  return (
    <span className={cn("figures whitespace-nowrap", className)}>
      <span className="sr-only">{`$${value.toFixed(2)}`}</span>
      <span aria-hidden>
        <motion.span>{whole}</motion.span>
        <motion.span className={cn("text-[0.55em] align-[0.42em] opacity-75", centsClassName)}>{cents}</motion.span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ panel */

export function Panel({
  className,
  children,
  as: Tag = "section",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <Tag
      className={cn("rounded-[1.75rem] bg-panel p-5 ring-1 ring-line/70 sm:p-6 dark:ring-white/[0.06]", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  action,
  children,
  id,
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 id={id} className="font-heading text-lg font-semibold tracking-[-0.015em] text-ink">
          {title}
        </h2>
        {children && <p className="mt-0.5 text-sm text-slate">{children}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- avatars */

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const avatarTones = ["bg-cat-1/15 text-cat-1", "bg-cat-3/15 text-cat-3", "bg-cat-7/15 text-cat-7", "bg-cat-2/15 text-cat-2"];

export function Avatar({ name, className }: { name: string; className?: string }) {
  const tone = avatarTones[name.length % avatarTones.length];
  return (
    <span
      aria-hidden
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", tone, className)}
    >
      {initials(name)}
    </span>
  );
}

/** Round icon for a transaction category; colour matches the spending chart. */
export function CategoryIcon({ category, className }: { category: CategoryId; className?: string }) {
  const meta = categoryMeta[category];
  const spend = spendCategories.find((c) => c.id === category);
  const Icon = meta.icon;
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        !spend && (category === "income" || category === "interest" ? "bg-positive/12 text-positive" : "bg-paper text-slate"),
        className,
      )}
      style={spend ? { color: spend.color } : undefined}
    >
      {spend && <span className="absolute inset-0 opacity-[0.14]" style={{ background: spend.color }} />}
      <Icon className="relative size-[1.1rem]" />
    </span>
  );
}

/* ----------------------------------------------------------------- hooks */

/** Tracks an element's rendered width, for charts drawn in real pixels. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold", className)}>
      {children}
    </span>
  );
}
