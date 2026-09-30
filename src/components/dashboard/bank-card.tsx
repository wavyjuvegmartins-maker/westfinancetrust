"use client";

import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Snowflake, Wifi } from "lucide-react";
import type { CardState } from "@/components/dashboard/data";
import { cn } from "@/lib/utils";

/** The debit card as an object you can handle: it tilts toward the pointer, flips, and frosts when frozen. */
export function BankCard({
  card,
  holder,
  flipped = false,
  className,
}: {
  card: CardState;
  holder: string;
  flipped?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-11, 11]), { stiffness: 180, damping: 18 });
  const rotateX = useSpring(useTransform(py, [0, 1], [9, -9]), { stiffness: 180, damping: 18 });
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.22), transparent 55%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  // Full card numbers are never stored: they stay with the card processor.
  const shownNumber = `•••• •••• •••• ${card.last4}`;

  return (
    <div className={cn("[perspective:1200px]", className)} onPointerMove={onMove} onPointerLeave={onLeave}>
      <motion.div style={{ rotateX, rotateY }} className="relative aspect-[1.586] w-full [transform-style:preserve-3d]">
        <motion.div
          className="absolute inset-0 [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* front */}
          <div
            role="img"
            aria-label={`Debit card ending ${card.last4}${card.frozen ? ", frozen" : ""}`}
            className="absolute inset-0 overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#2b3f63] via-[#0f1b33] to-[#081022] p-[7%] text-white shadow-[0_28px_60px_-24px_rgba(8,16,34,0.8)] ring-1 ring-white/10 [backface-visibility:hidden]"
          >
            <svg aria-hidden viewBox="0 0 400 252" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <ellipse cx="300" cy="205" rx="195" ry="82" fill="none" stroke="#e8952b" strokeWidth="16" strokeLinecap="round" strokeDasharray="700 400" transform="rotate(-22 300 205)" />
            </svg>
            <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: glare }} />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="font-heading text-[clamp(0.8rem,2.2vw,1.02rem)] font-semibold tracking-[-0.01em]">West Finance Trust</span>
                <span className="text-[clamp(0.62rem,1.6vw,0.78rem)] font-medium text-white/70">Debit</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="block h-[17%] min-h-6 w-[13%] min-w-9 rounded-md bg-gradient-to-br from-[#f6d9a8] to-[#c99a52]" />
                <Wifi className="size-5 rotate-90 text-white/70" aria-hidden />
              </div>
              <div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={shownNumber}
                    initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                    transition={{ duration: 0.25 }}
                    className="figures text-[clamp(0.85rem,2.5vw,1.12rem)] tracking-[0.16em] text-white/95"
                  >
                    {shownNumber}
                  </motion.p>
                </AnimatePresence>
                <div className="mt-1.5 flex items-center justify-between text-[clamp(0.62rem,1.6vw,0.78rem)] text-white/65">
                  <span>{holder}</span>
                  <span className="figures">{card.expiry}</span>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {card.frozen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#bcd7f5]/25 backdrop-blur-[6px]"
                >
                  <motion.span initial={{ rotate: -90, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", bounce: 0.4 }}>
                    <Snowflake className="size-9 text-white drop-shadow" aria-hidden />
                  </motion.span>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white">Frozen</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* back */}
          <div
            aria-hidden={!flipped}
            className="absolute inset-0 overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#0f1b33] to-[#1d2c4a] text-white shadow-[0_28px_60px_-24px_rgba(8,16,34,0.8)] ring-1 ring-white/10 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <div className="mt-[9%] h-[17%] bg-black/70" />
            <div className="flex items-center gap-3 px-[7%] pt-[6%]">
              <div className="h-9 flex-1 rounded-md bg-[repeating-linear-gradient(135deg,#f3f0e8,#f3f0e8_6px,#e7e2d6_6px,#e7e2d6_12px)]" />
              <div className="rounded-md bg-white px-3 py-1.5 text-center">
                <span className="block text-[0.55rem] font-semibold tracking-wide text-slate-500">CVV</span>
                <span className="figures font-heading text-base font-semibold text-[#0f1b33]">•••</span>
              </div>
            </div>
            <p className="px-[7%] pt-[5%] text-[0.65rem] leading-relaxed text-white/55">
              Your security code is printed on the back of your physical card. Lost or stolen? Freeze it here and call us.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
