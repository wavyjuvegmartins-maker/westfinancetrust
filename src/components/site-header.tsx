"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { LockKeyhole, Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { nav } from "@/lib/site";

function SoonTag() {
  return (
    <span className="rounded-full bg-amber-soft px-1.5 py-0.5 text-[0.68rem] leading-none font-semibold text-amber-ink">
      Soon
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "border-line bg-surface/90 shadow-[0_10px_30px_-18px_rgba(15,27,51,0.35)]"
          : "border-transparent bg-surface/70",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]">
        <Logo />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.93rem] font-medium transition-colors",
                      active ? "text-ink" : "text-slate hover:text-ink",
                    )}
                  >
                    {item.label}
                    {item.soon && <SoonTag />}
                    {active && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-3 -bottom-[0.9rem] h-0.5 rounded-full bg-amber"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        aria-hidden
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:flex" />
          <ButtonLink href="/login" variant="ink" size="md" aria-current={isActive("/login") ? "page" : undefined}>
            <LockKeyhole aria-hidden />
            Log in
          </ButtonLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-paper lg:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Main"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-surface lg:hidden"
          >
            <ul className="container-page py-3">
              {nav.map((item, i) => (
                <motion.li
                  key={item.href}
                  className="border-b border-line/70"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.04 * i + 0.05, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="flex items-center justify-between py-3.5 font-heading text-lg font-medium text-ink aria-[current=page]:text-amber-ink"
                  >
                    <span className="flex items-center gap-2">
                      {item.label}
                      {item.soon && <SoonTag />}
                    </span>
                  </Link>
                </motion.li>
              ))}
              <li className="flex items-center justify-between pt-4 pb-1 sm:hidden">
                <span className="text-sm font-medium text-slate">Appearance</span>
                <ThemeToggle />
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
