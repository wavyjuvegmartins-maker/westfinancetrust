"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState } from "react";
import { motion } from "motion/react";
import { ClipboardList, Ellipsis, Hourglass, Inbox, LayoutDashboard, Loader2, LogOut, Search, UserPlus, Users, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { findAccount } from "@/lib/admin/actions";
import { fullName, type UserProfile } from "@/lib/auth/types";
import { images } from "@/lib/images";
import { cn } from "@/lib/utils";

const nav: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/customers", label: "Customers", icon: Users, exact: true },
  { href: "/admin/customers/new", label: "Register customer", icon: UserPlus },
  { href: "/admin/messages", label: "Messages", icon: Inbox },
  { href: "/admin/waitlist", label: "Loan waitlist", icon: Hourglass },
  { href: "/admin/audit", label: "Audit log", icon: ClipboardList },
];

export function AdminShell({ user, openMessages, children }: { user: UserProfile; openMessages: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (item: (typeof nav)[number]) =>
    item.exact ? pathname === item.href || (item.href === "/admin/customers" && /^\/admin\/customers\/(?!new)/.test(pathname)) : pathname.startsWith(item.href);

  return (
    <div className="min-h-dvh bg-canvas text-ink lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-deep px-4 py-6 text-white lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2">
          <Image src={images.logoLight.src} alt="" width={images.logoLight.width} height={images.logoLight.height} className="h-9 w-auto" priority />
          <span className="leading-tight">
            <span className="block font-heading text-[1rem] font-semibold tracking-[-0.02em]">West Finance Trust</span>
            <span className="text-xs font-semibold text-amber">Staff</span>
          </span>
        </Link>
        <nav aria-label="Admin" className="mt-10">
          <ul className="space-y-1">
            {nav.map((item) => {
              const on = active(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition-colors",
                      on ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {on && (
                      <motion.span layoutId="admin-active" className="absolute inset-0 rounded-xl bg-white/[0.09] ring-1 ring-white/10" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}>
                        <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full bg-amber" />
                      </motion.span>
                    )}
                    <item.icon className="relative size-[1.15rem]" aria-hidden />
                    <span className="relative">{item.label}</span>
                    {item.href === "/admin/messages" && openMessages > 0 && (
                      <span className="relative ml-auto rounded-full bg-amber px-2 py-0.5 text-[0.7rem] font-bold text-deep">{openMessages}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto flex items-center gap-3 px-1">
          <span className="flex size-10 items-center justify-center rounded-full bg-amber/20 text-sm font-semibold text-amber">
            {user.firstName[0]}
            {user.lastName[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{fullName(user)}</p>
            <p className="truncate text-xs text-white/55 capitalize">{user.role.replace("_", " ")}</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Phones: navy app bar. From lg up: the light desktop bar with the account lookup. */}
        <header className="sticky top-0 z-30 bg-deep pt-[env(safe-area-inset-top)] text-white lg:border-b lg:border-line/60 lg:bg-canvas/85 lg:pt-0 lg:text-ink lg:backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <Image src={images.logoLight.src} alt="" width={images.logoLight.width} height={images.logoLight.height} className="h-8 w-auto" priority />
              <span className="leading-tight">
                <span className="block truncate font-heading text-[0.98rem] font-semibold tracking-[-0.02em]">West Finance Trust</span>
                <span className="text-xs font-semibold text-amber">Staff</span>
              </span>
            </Link>
            <AccountLookup className="hidden lg:block" />
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle className="hidden bg-panel lg:flex" />
              <form action={signOut} className="hidden lg:block">
                <button type="submit" className="flex h-10 items-center gap-2 rounded-full bg-panel px-4 text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper">
                  <LogOut className="size-4" aria-hidden /> Log out
                </button>
              </form>
              <span className="flex size-10 items-center justify-center rounded-full bg-amber text-sm font-semibold text-deep lg:hidden" aria-hidden>
                {user.firstName[0]}
                {user.lastName[0]}
              </span>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1280px] px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] sm:px-6 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
      <AdminTabBar active={active} openMessages={openMessages} user={user} />
      <Toaster position="bottom-right" mobileOffset={{ bottom: 96 }} richColors closeButton />
    </div>
  );
}

/* --------------------------------------------------------- phone tab bar */

type NavItem = (typeof nav)[number];

const tabClass = "relative flex h-13 w-full flex-col items-center justify-center gap-0.5 rounded-[1.15rem] text-[0.68rem] font-semibold transition-colors";

function AdminTabBar({ active, openMessages, user }: { active: (item: NavItem) => boolean; openMessages: number; user: UserProfile }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [overview, customers, register, messages, ...rest] = nav;

  const tab = (item: NavItem, badge = 0) => {
    const on = active(item);
    return (
      <Link href={item.href} aria-current={on ? "page" : undefined} className={cn(tabClass, on ? "text-ink" : "text-slate hover:text-ink")}>
        {on && (
          <motion.span
            layoutId="admin-tab"
            className="absolute inset-0 rounded-[1.15rem] bg-canvas dark:bg-white/[0.07]"
            transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
          />
        )}
        <item.icon className={cn("relative size-5", on && "text-amber-ink")} aria-hidden />
        <span className="relative">{item.label}</span>
        {badge > 0 && (
          <span className="absolute top-1 right-[calc(50%-1.25rem)] flex min-w-[1.1rem] items-center justify-center rounded-full bg-amber px-1 text-[0.62rem] leading-[1.1rem] font-bold text-deep">
            {badge}
            <span className="sr-only"> new</span>
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Staff"
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto max-w-md rounded-[1.75rem] bg-panel/85 p-1.5 shadow-[0_18px_40px_-16px_rgb(15_27_51/0.45)] ring-1 ring-line/80 backdrop-blur-xl lg:hidden dark:ring-white/10"
      >
        <ul className="grid grid-cols-5 items-center">
          <li>{tab(overview)}</li>
          <li>{tab(customers)}</li>
          <li className="flex justify-center">
            <Link
              href={register.href}
              aria-label={register.label}
              className="flex size-13 items-center justify-center rounded-[1.15rem] bg-amber text-deep shadow-[0_10px_24px_-10px_rgba(232,149,43,0.9)] transition-colors hover:bg-amber-strong"
            >
              <UserPlus className="size-[1.35rem]" strokeWidth={2.25} aria-hidden />
            </Link>
          </li>
          <li>{tab(messages, openMessages)}</li>
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className={cn(tabClass, rest.some(active) ? "text-ink" : "text-slate hover:text-ink")}
            >
              <Ellipsis className="size-5" aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-[1.75rem] bg-panel pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <SheetHeader>
            <SheetTitle className="font-heading text-lg">{fullName(user)}</SheetTitle>
            <SheetDescription className="capitalize">{user.role.replace("_", " ")}</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <AccountLookup onFound={() => setMoreOpen(false)} wide />
          </div>
          <ul className="mt-2 grid gap-1 px-4">
            {rest.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 font-medium text-ink hover:bg-canvas">
                  <item.icon className="size-5 text-slate" aria-hidden />
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center justify-between px-3 py-2">
              <span className="font-medium text-ink">Appearance</span>
              <ThemeToggle />
            </li>
            <li>
              <form action={signOut}>
                <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 font-medium text-negative hover:bg-canvas">
                  <LogOut className="size-5" aria-hidden /> Log out
                </button>
              </form>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* --------------------------------------------------------- account lookup */

function AccountLookup({ className, onFound, wide = false }: { className?: string; onFound?: () => void; wide?: boolean }) {
  const inputId = useId();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={cn("relative", className)}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await findAccount(value);
        setBusy(false);
        if (res.ok && res.customerId) {
          setValue("");
          onFound?.();
          router.push(`/admin/customers/${res.customerId}`);
        } else toast.error(res.message);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Find by account number
      </label>
      {busy ? (
        <Loader2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-slate" aria-hidden />
      ) : (
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" aria-hidden />
      )}
      <input
        id={inputId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="numeric"
        placeholder="Find by account number"
        className={cn(
          "h-10 w-64 rounded-full border border-input bg-panel pr-4 pl-9 text-sm text-ink outline-none placeholder:text-slate focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          wide && "h-12 w-full bg-canvas text-base",
        )}
      />
    </form>
  );
}
