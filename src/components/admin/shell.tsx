"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { ClipboardList, Hourglass, Inbox, LayoutDashboard, Loader2, LogOut, Search, UserPlus, Users, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
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
        <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <nav aria-label="Admin" className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:hidden">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active(item) ? "page" : undefined}
                  className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold", active(item) ? "bg-ink text-surface" : "text-slate")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <AccountLookup />
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle className="bg-panel" />
              <form action={signOut}>
                <button type="submit" className="flex h-10 items-center gap-2 rounded-full bg-panel px-4 text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper">
                  <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Log out</span>
                </button>
              </form>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

function AccountLookup() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="relative hidden md:block"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await findAccount(value);
        setBusy(false);
        if (res.ok && res.customerId) {
          setValue("");
          router.push(`/admin/customers/${res.customerId}`);
        } else toast.error(res.message);
      }}
    >
      <label htmlFor="account-lookup" className="sr-only">
        Find by account number
      </label>
      {busy ? (
        <Loader2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-slate" aria-hidden />
      ) : (
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" aria-hidden />
      )}
      <input
        id="account-lookup"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="numeric"
        placeholder="Find by account number"
        className="h-10 w-64 rounded-full border border-input bg-panel pr-4 pl-9 text-sm text-ink outline-none placeholder:text-slate focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      />
    </form>
  );
}
