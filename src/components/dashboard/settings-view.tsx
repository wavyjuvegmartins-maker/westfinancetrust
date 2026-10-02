"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { KeyRound, Loader2, LogOut, MonitorSmartphone, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/app/actions";
import { InstallAppRow } from "@/components/app/install";
import { PushToggle } from "@/components/app/push-toggle";
import type { Prefs } from "@/components/dashboard/data";
import { useBank } from "@/components/dashboard/store";
import { Avatar, Panel, PanelHeader } from "@/components/dashboard/ui";
import { useUser } from "@/components/dashboard/user";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fullName } from "@/lib/auth/types";
import { signOutOtherDevices } from "@/lib/banking/actions";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const alerts: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "activityEmails", label: "Account activity", hint: "Deposits, withdrawals, bills and payments" },
  { key: "largePayments", label: "Card payments", hint: "A notification for every card payment" },
  { key: "lowBalance", label: "Low balance", hint: "When checking drops below $250" },
  { key: "loginAlerts", label: "New sign-ins", hint: "When a new device signs in to your account" },
  { key: "weeklySummary", label: "Weekly summary", hint: "Your spending and saving, every Monday" },
];

const noop = () => () => {};

export function SettingsView() {
  const { state, dispatch } = useBank();
  const user = useUser();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [signingOut, setSigningOut] = useState(false);
  const name = fullName(user);

  const signOutElsewhere = async () => {
    setSigningOut(true);
    const result = await signOutOtherDevices();
    setSigningOut(false);
    if (result.ok) toast.success("Signed out everywhere else", { description: "Only this device is still signed in." });
    else toast.error(result.message);
  };

  return (
    <div className="space-y-5">
      <div className="pt-2">
        <h1 className="font-heading text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Settings</h1>
        <p className="mt-1 text-slate">Your details, security and how online banking looks and behaves.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel aria-labelledby="profile-title">
          <PanelHeader id="profile-title" title="Your details" />
          <div className="flex items-center gap-4">
            <Avatar name={name} className="size-14 bg-amber text-lg text-deep" />
            <div>
              <p className="font-heading text-lg font-semibold text-ink">{name}</p>
              <p className="text-sm text-slate">Customer since {user.memberSince}</p>
            </div>
          </div>
          <dl className="mt-5 divide-y divide-line text-sm">
            {[
              ["User ID", user.userId],
              ["Email", user.email],
              ["Phone", user.phone || "Not on file"],
              ["Home branch", user.branch],
            ].map(([term, detail]) => (
              <div key={term} className="flex justify-between gap-4 py-3">
                <dt className="text-slate">{term}</dt>
                <dd className="text-right font-medium text-ink">{detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-sm text-slate">
            To change your details, call {site.phone} or visit a branch. We verify every change in person or by phone to keep your account safe.
          </p>
        </Panel>

        <Panel aria-labelledby="security-title">
          <PanelHeader id="security-title" title="Security" />
          <div className="grid gap-3">
            <Link
              href="/change-password"
              className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3.5 transition-colors hover:bg-paper"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-panel text-ink ring-1 ring-line">
                <KeyRound className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">Change your password</span>
                <span className="text-xs text-slate">Pick a new one any time</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={signOutElsewhere}
              disabled={signingOut}
              className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3.5 text-left transition-colors hover:bg-paper disabled:opacity-60"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-panel text-ink ring-1 ring-line">
                {signingOut ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MonitorSmartphone className="size-4" aria-hidden />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">Sign out of other devices</span>
                <span className="text-xs text-slate">Everywhere except this browser</span>
              </span>
            </button>
          </div>
          <p className="mt-4 text-sm text-slate">
            Think someone else has your login? Change your password now and call {site.phone}.
          </p>
        </Panel>

        <Panel aria-labelledby="alerts-title">
          <PanelHeader id="alerts-title" title="Notifications">
            Shown here and emailed to {user.email}. Security emails, like a password change or a new payee, are always sent.
          </PanelHeader>
          <PushToggle className="mb-1 rounded-2xl bg-canvas px-4 py-3.5" />
          <ul className="divide-y divide-line">
            {alerts.map((a) => (
              <li key={a.key} className="flex items-center justify-between gap-4 py-3.5">
                <span>
                  <span className="block text-sm font-semibold text-ink">{a.label}</span>
                  <span className="text-xs text-slate">{a.hint}</span>
                </span>
                <Switch
                  checked={state.prefs[a.key]}
                  onCheckedChange={(on) => {
                    dispatch({ type: "prefs", patch: { [a.key]: on } });
                    toast.success(`${a.label} alerts ${on ? "on" : "off"}`);
                  }}
                  aria-label={`${a.label} alerts`}
                  className="data-checked:bg-amber"
                />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel aria-labelledby="appearance-title">
          <PanelHeader id="appearance-title" title="Appearance and privacy" />
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
            {[
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
              { id: "system", label: "Match device", icon: Monitor },
            ].map((t) => {
              const selected = mounted && theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-sm font-semibold ring-1 transition-colors",
                    selected ? "bg-amber-soft text-ink ring-amber" : "text-slate ring-line hover:text-ink",
                  )}
                >
                  <t.icon className="size-5" aria-hidden />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
            <span>
              <span className="block text-sm font-semibold text-ink">Hide balances</span>
              <span className="text-xs text-slate">Useful when someone can see your screen</span>
            </span>
            <Switch
              checked={state.hideBalances}
              onCheckedChange={() => dispatch({ type: "toggleHide" })}
              aria-label="Hide balances"
              className="data-checked:bg-amber"
            />
          </div>
          <InstallAppRow />
        </Panel>
      </div>

      <form action={signOut}>
        <Button type="submit" variant="outline-ink" size="xl">
          <LogOut aria-hidden /> Log out
        </Button>
      </form>
    </div>
  );
}
