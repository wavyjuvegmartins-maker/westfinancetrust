"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "motion/react";

export const ease = [0.22, 1, 0.36, 1] as const;

const tags = {
  div: motion.div,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
  p: motion.p,
  span: motion.span,
  article: motion.article,
} as const;
type Tag = keyof typeof tags;

type BaseProps = {
  as?: Tag;
  className?: string;
  id?: string;
  children?: React.ReactNode;
};

/** Fades and lifts its content into place the first time it scrolls into view. */
export function Reveal({
  as = "div",
  delay = 0,
  y = 28,
  scale = 1,
  className,
  id,
  children,
}: BaseProps & { delay?: number; y?: number; scale?: number }) {
  const Component = tags[as];
  return (
    <Component
      id={id}
      className={className}
      initial={{ opacity: 0, y, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.75, ease, delay }}
    >
      {children}
    </Component>
  );
}

const group: Variants = {
  hidden: {},
  show: (stagger: number) => ({ transition: { staggerChildren: stagger, delayChildren: 0.05 } }),
};

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

/** A list whose children (RevealItem) appear one after another. */
export function RevealGroup({ as = "div", stagger = 0.08, className, id, children }: BaseProps & { stagger?: number }) {
  const Component = tags[as];
  return (
    <Component
      id={id}
      className={className}
      variants={group}
      custom={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </Component>
  );
}

export function RevealItem({ as = "div", className, id, children }: BaseProps) {
  const Component = tags[as];
  return (
    <Component id={id} className={className} variants={item}>
      {children}
    </Component>
  );
}

/** Image frame that wipes open from below while the picture settles from a slight zoom. */
export function ImageReveal({
  className,
  radius = "1.5rem",
  delay = 0,
  children,
}: {
  className?: string;
  radius?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  // The in-view check sits on the unclipped wrapper: a fully clipped element has no visible
  // area, so the browser would never report it entering the viewport.
  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
      <motion.div
        className="h-full w-full"
        variants={{
          hidden: { clipPath: `inset(100% 0% 0% 0% round ${radius})` },
          show: { clipPath: `inset(0% 0% 0% 0% round ${radius})`, transition: { duration: 1.05, ease, delay } },
        }}
      >
        <motion.div
          className="h-full w-full"
          variants={{
            hidden: { scale: 1.15 },
            show: { scale: 1, transition: { duration: 1.5, ease, delay } },
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** A rule that draws itself from left to right when it comes into view. */
export function GrowLine({ className, delay = 0.2 }: { className?: string; delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className={className}
      style={{ originX: 0 }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 1.1, ease, delay }}
    />
  );
}

/** Counts up to `value` the first time it scrolls into view. Screen readers get the final figure. */
export function CountUp({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  duration = 1.4,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease });
    return () => controls.stop();
  }, [inView, reduce, value, duration, mv]);

  const final = `${prefix}${value.toFixed(decimals)}${suffix}`;
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{final}</span>
      <motion.span aria-hidden>{text}</motion.span>
    </span>
  );
}

/** The logo's orbit, drawn in when it comes into view. For decorative use on navy bands. */
export function DrawnOrbit({
  className,
  viewBox = "0 0 600 300",
  cx = 300,
  cy = 150,
  rx = 270,
  ry = 105,
  rotate = -16,
  strokeWidth = 14,
  length = 0.78,
}: {
  className?: string;
  viewBox?: string;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  rotate?: number;
  strokeWidth?: number;
  length?: number;
}) {
  return (
    <svg aria-hidden viewBox={viewBox} className={className}>
      <motion.ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="#e8952b"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        transform={`rotate(${rotate} ${cx} ${cy})`}
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: length }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.6, ease, delay: 0.2 }}
      />
    </svg>
  );
}
