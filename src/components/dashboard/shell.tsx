"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeftRight,
  Bell,
  CircleAlert,
  CreditCard,
  Ellipsis,
  Eye,
  EyeOff,
  HandCoins,
  House,
  Landmark,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Snowflake,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/actions";
import { categoryMeta, type BankState } from "@/components/dashboard/data";
import { MoveMoneyProvider, useMoveMoney } from "@/components/dashboard/move-money";
import { relativeTime } from "@/components/dashboard/selectors";
import { BankProvider, useBank } from "@/components/dashboard/store";
import { Avatar, CategoryIcon } from "@/components/dashboard/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { fullName, type UserProfile } from "@/lib/auth/types";
import { UserProvider, useUser } from "@/components/dashboard/user";
import { images } from "@/lib/images";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

type AppNavItem = { href: string; label: string; icon: LucideIcon; soon?: boolean };

export const appNav: AppNavItem[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/activity", label: "Activity", icon: ReceiptText },
  { href: "/dashboard/move", label: "Move money", icon: ArrowLeftRight },
  { href: "/dashboard/cards", label: "Cards", icon: CreditCard },
  { href: "/dashboard/loans", label: "Loans", icon: HandCoins, soon: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const isActive = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/* ------------------------------------------------------------------ shell */

export function DashboardShell({ user, bank, children }: { user: UserProfile; bank: BankState; children: React.ReactNode }) {
  return (
    <UserProvider user={user}>
    <BankProvider bank={bank} profileId={user.id}>
      <MoveMoneyProvider>
        <div className="min-h-dvh bg-canvas text-ink lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
          <Sidebar />
          <div className="min-w-0">
            <Topbar />
            <PageFrame>{children}</PageFrame>
          </div>
          <MobileTabBar />
        </div>
        <Toaster position="bottom-right" mobileOffset={{ bottom: 96 }} richColors closeButton />
      </MoveMoneyProvider>
    </BankProvider>
    </UserProvider>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <main id="main" className="mx-auto w-full max-w-[1320px] px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] sm:px-6 lg:px-8 lg:pt-2 lg:pb-14">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </main>
  );
}

/* ---------------------------------------------------------------- sidebar */

function Sidebar() {
  const pathname = usePathname();
  const user = useUser();
  const { state } = useBank();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col bg-deep px-4 py-6 text-white lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2" aria-label={`${site.name} dashboard`}>
        <Image src={images.logoLight.src} alt="" width={images.logoLight.width} height={images.logoLight.height} className="h-9 w-auto" priority />
        <span className="font-heading text-[1.02rem] leading-tight font-semibold tracking-[-0.02em]">
          West Finance <span className="font-medium">Trust</span>
        </span>
      </Link>

      <nav aria-label="Online banking" className="mt-10">
        <ul className="space-y-1">
          {appNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition-colors",
                    active ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="side-active"
                      className="absolute inset-0 rounded-xl bg-white/[0.09] ring-1 ring-white/10"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                    >
                      <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full bg-amber" />
                    </motion.span>
                  )}
                  <item.icon className="relative size-[1.15rem]" aria-hidden />
                  <span className="relative">{item.label}</span>
                  {item.soon && (
                    <span className="relative ml-auto rounded-full bg-amber/15 px-2 py-0.5 text-[0.66rem] font-semibold text-amber">Soon</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-4">
        {state.card?.frozen && (
          <Link href="/dashboard/cards" className="flex items-center gap-2.5 rounded-xl bg-[#bcd7f5]/10 px-3 py-2.5 text-sm text-white/85 ring-1 ring-[#bcd7f5]/20">
            <Snowflake className="size-4 text-[#bcd7f5]" aria-hidden />
            Your card is frozen
          </Link>
        )}
        <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-amber" aria-hidden />
            Need a hand?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Real people, every day. Call{" "}
            <a href={site.phoneHref} className="font-semibold text-white hover:text-amber">
              {site.phone}
            </a>
          </p>
        </div>
        <div className="flex items-center gap-3 px-1">
          <Avatar name={fullName(user)} className="bg-amber/20 text-amber" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {fullName(user)}
            </p>
            <p className="truncate text-xs text-white/55">Personal banking</p>
          </div>
          <form action={signOut}>
            <button type="submit" className="flex size-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Log out">
              <LogOut className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/* ----------------------------------------------------------------- topbar */

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Topbar() {
  const { state, dispatch } = useBank();
  const user = useUser();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    // Phones get navy app chrome (it runs on into the balance stage on Home); from lg up it's the light desktop bar.
    <header className="sticky top-0 z-30 bg-deep pt-[env(safe-area-inset-top)] text-white lg:border-b lg:border-transparent lg:bg-canvas/80 lg:pt-0 lg:text-ink lg:backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Image src={images.logoLight.src} alt="" width={images.logoLight.width} height={images.logoLight.height} className="h-8 w-auto lg:hidden" priority />
          <div className="min-w-0">
            <p className="truncate font-heading text-lg leading-tight font-semibold tracking-[-0.02em] lg:text-2xl">
              <span className="sm:hidden">Hi, {user.firstName}</span>
              <span className="hidden sm:inline">
                {greeting()}, {user.firstName}
              </span>
            </p>
            <p className="hidden text-sm text-white/60 sm:block lg:text-slate">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-10 items-center gap-2 rounded-full bg-panel pr-2 pl-3.5 text-sm text-slate ring-1 ring-line transition-colors hover:text-ink lg:flex"
          >
            <Search className="size-4" aria-hidden />
            Search
            <kbd className="ml-3 rounded-md bg-canvas px-1.5 py-0.5 font-sans text-[0.7rem] font-semibold text-slate">Ctrl K</kbd>
          </button>
          <IconButton label="Search" onClick={() => setSearchOpen(true)} className="lg:hidden">
            <Search className="size-[1.1rem]" />
          </IconButton>
          <IconButton
            label={state.hideBalances ? "Show balances" : "Hide balances"}
            onClick={() => dispatch({ type: "toggleHide" })}
            pressed={state.hideBalances}
          >
            {state.hideBalances ? <EyeOff className="size-[1.1rem]" /> : <Eye className="size-[1.1rem]" />}
          </IconButton>
          <ThemeToggle className="hidden bg-panel lg:flex" />
          <Notifications />
          <AccountMenu />
        </div>
      </div>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

const chromeButton =
  "relative flex size-10 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/10 transition-colors hover:bg-white/15 lg:bg-panel lg:text-ink lg:ring-line lg:hover:bg-paper";

function IconButton({
  label,
  onClick,
  children,
  className,
  pressed,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        chromeButton,
        className,
      )}
    >
      {children}
    </button>
  );
}

const noticeIcon = { payment: ArrowLeftRight, security: ShieldCheck, deposit: Landmark, info: HandCoins, blocked: CircleAlert };

function Notifications() {
  const { state, dispatch } = useBank();
  const unread = state.notices.filter((n) => !n.read).length;
  return (
    <DropdownMenu onOpenChange={(open) => !open && unread && dispatch({ type: "readNotices" })}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
            className={chromeButton}
          />
        }
      >
        <Bell className="size-[1.1rem]" aria-hidden />
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="absolute -top-0.5 -right-0.5 flex min-w-[1.15rem] items-center justify-center rounded-full bg-amber px-1 text-[0.65rem] leading-[1.15rem] font-bold text-deep ring-2 ring-deep lg:ring-canvas"
          >
            {unread}
          </motion.span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl p-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink">
            Notifications
            {unread > 0 && <span className="text-xs font-medium text-slate">{unread} new</span>}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[22rem] overflow-y-auto p-1.5">
          {state.notices.slice(0, 12).map((n) => {
            const Icon = noticeIcon[n.kind];
            return (
              <DropdownMenuItem key={n.id} className="items-start gap-3 rounded-xl px-2.5 py-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    n.kind === "blocked" ? "bg-negative/12 text-negative" : n.kind === "deposit" ? "bg-positive/12 text-positive" : "bg-amber-soft text-amber-ink",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {n.title}
                    {!n.read && <span className="size-1.5 rounded-full bg-amber" aria-label="unread" />}
                  </span>
                  <span className="block text-xs leading-relaxed text-slate">{n.body}</span>
                  <span className="mt-0.5 block text-[0.7rem] text-slate/80">{relativeTime(n.date)}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu() {
  const router = useRouter();
  const user = useUser();
  const formRef = useRef<HTMLFormElement>(null);
  const name = fullName(user);
  return (
    <>
      <form ref={formRef} action={signOut} className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<button type="button" aria-label="Your account" className="rounded-full ring-2 ring-transparent transition-shadow hover:ring-amber/60" />}
        >
          <Avatar name={name} className="bg-amber text-deep" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-2xl p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 py-2">
              <span className="block text-sm font-semibold text-ink">{name}</span>
              <span className="block text-xs font-normal text-slate">User ID {user.userId}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push("/dashboard/settings")}>
            <Settings className="size-4" aria-hidden /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push("/")}>
            <House className="size-4" aria-hidden /> Back to website
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => formRef.current?.requestSubmit()}>
            <LogOut className="size-4" aria-hidden /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/* --------------------------------------------------------- search palette */

type Result = { id: string; label: string; hint: string; icon: React.ReactNode; run: () => void };

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { state, dispatch } = useBank();
  const move = useMoveMoney();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const close = (fn: () => void) => () => {
      onOpenChange(false);
      setQuery("");
      fn();
    };
    const pages: Result[] = appNav.map((p) => ({
      id: p.href,
      label: p.label,
      hint: "Go to",
      icon: <p.icon className="size-4" />,
      run: close(() => router.push(p.href)),
    }));
    const actions: Result[] = [
      { id: "a-transfer", label: "Transfer between accounts", hint: "Action", icon: <ArrowLeftRight className="size-4" />, run: close(() => move.open("transfer")) },
      { id: "a-send", label: "Send money to someone", hint: "Action", icon: <Plus className="size-4" />, run: close(() => move.open("send")) },
      ...(state.card
        ? [
            {
              id: "a-freeze",
              label: state.card.frozen ? "Unfreeze your card" : "Freeze your card",
              hint: "Action",
              icon: <Snowflake className="size-4" />,
              run: close(() => dispatch({ type: "card", patch: { frozen: !state.card!.frozen } })),
            },
          ]
        : []),
      { id: "a-hide", label: state.hideBalances ? "Show balances" : "Hide balances", hint: "Action", icon: <EyeOff className="size-4" />, run: close(() => dispatch({ type: "toggleHide" })) },
    ];
    const matches = (s: string) => !q || s.toLowerCase().includes(q);
    const txns: Result[] = q
      ? state.txns
          .filter((t) => t.merchant.toLowerCase().includes(q) || categoryMeta[t.category].label.toLowerCase().includes(q))
          .slice(0, 6)
          .map((t) => ({
            id: t.id,
            label: t.merchant,
            hint: new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            icon: <CategoryIcon category={t.category} className="size-7 rounded-lg" />,
            run: close(() => router.push(`/dashboard/activity?q=${encodeURIComponent(t.merchant)}`)),
          }))
      : [];
    return [...pages.filter((p) => matches(p.label)), ...actions.filter((a) => matches(a.label)), ...txns];
  }, [query, state, router, move, dispatch, onOpenChange]);

  const active = Math.min(index, Math.max(results.length - 1, 0));

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQuery(""); }}>
      <DialogContent showCloseButton={false} className="top-[18%] translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Search online banking</DialogTitle>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 text-slate" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                results[active]?.run();
              }
            }}
            placeholder="Search pages, actions and payments"
            aria-label="Search"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            className="h-14 flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-slate"
          />
        </div>
        <ul id="palette-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate">No matches for “{query}”.</li>}
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`palette-${r.id}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setIndex(i)}
              onClick={r.run}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                i === active ? "bg-canvas text-ink" : "text-ink/85",
              )}
            >
              <span className="flex size-7 items-center justify-center text-slate">{r.icon}</span>
              <span className="flex-1 font-medium">{r.label}</span>
              <span className="text-xs text-slate">{r.hint}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------- mobile tab bar */

function MobileTabBar() {
  const pathname = usePathname();
  const move = useMoveMoney();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = [appNav[0], appNav[1], null, appNav[3]] as const;

  return (
    <>
      {/* Floating tab bar: four destinations with "move money" in the middle. */}
      <nav
        aria-label="Online banking"
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto max-w-md rounded-[1.75rem] bg-panel/85 p-1.5 shadow-[0_18px_40px_-16px_rgb(15_27_51/0.45)] ring-1 ring-line/80 backdrop-blur-xl lg:hidden dark:ring-white/10"
      >
        <ul className="grid grid-cols-5 items-center">
          {tabs.map((item) =>
            item ? (
              <li key={item.href}>
                <TabLink href={item.href} label={item.label} icon={item.icon} active={isActive(pathname, item.href)} />
              </li>
            ) : (
              <li key="move" className="flex justify-center">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => move.open("transfer")}
                  className="flex size-13 items-center justify-center rounded-[1.15rem] bg-amber text-deep shadow-[0_10px_24px_-10px_rgba(232,149,43,0.9)] transition-colors hover:bg-amber-strong"
                  aria-label="Move money"
                >
                  <ArrowLeftRight className="size-[1.35rem]" strokeWidth={2.25} aria-hidden />
                </motion.button>
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className={cn(
                tabClass,
                ["/dashboard/loans", "/dashboard/settings", "/dashboard/move"].some((h) => isActive(pathname, h)) ? "text-ink" : "text-slate",
              )}
            >
              <Ellipsis className="relative size-5" aria-hidden />
              <span className="relative">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-[1.75rem] bg-panel pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <SheetHeader>
            <SheetTitle className="font-heading text-lg">More</SheetTitle>
            <SheetDescription className="sr-only">Other pages and settings</SheetDescription>
          </SheetHeader>
          <ul className="grid gap-1 px-4">
            {[appNav[2], appNav[4], appNav[5]].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 font-medium text-ink hover:bg-canvas"
                >
                  <item.icon className="size-5 text-slate" aria-hidden />
                  {item.label}
                  {item.soon && <span className="ml-auto rounded-full bg-amber-soft px-2 py-0.5 text-[0.68rem] font-semibold text-amber-ink">Soon</span>}
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

const tabClass = "relative flex h-13 w-full flex-col items-center justify-center gap-0.5 rounded-[1.15rem] text-[0.68rem] font-semibold transition-colors";

function TabLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn(tabClass, active ? "text-ink" : "text-slate hover:text-ink")}>
      {active && (
        <motion.span
          layoutId="tab-active"
          className="absolute inset-0 rounded-[1.15rem] bg-canvas dark:bg-white/[0.07]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
        />
      )}
      <Icon className={cn("relative size-5", active && "text-amber-ink")} aria-hidden />
      <span className="relative">{label}</span>
    </Link>
  );
}
