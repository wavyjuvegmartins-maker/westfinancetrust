"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useOptimistic, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions";
import type { BankState, CardState, Prefs, SpendCategory } from "@/components/dashboard/data";
import type { BillValues, GoalValues } from "@/lib/schemas";
import {
  addToGoal,
  deleteBill,
  deleteGoal,
  joinLoanWaitlistInApp,
  markNotificationsRead,
  payBill,
  removeMyPayee,
  replaceCard,
  saveBill,
  saveGoal,
  sendMoney,
  transferMoney,
  updateCard,
  updateSettings,
  updateTransaction,
} from "@/lib/banking/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/* ----------------------------------------------------------------- actions */

export type Action =
  | { type: "transfer"; from: string; to: string; amount: number; note?: string }
  | { type: "send"; from: string; payeeId: string; amount: number; note?: string }
  | { type: "payBill"; billId: string; from: string }
  | { type: "addToGoal"; goalId: string; from: string; amount: number }
  | { type: "card"; patch: Partial<Pick<CardState, "frozen" | "online" | "contactless" | "atm" | "abroad" | "dailyLimit">> }
  | { type: "replaceCard"; reason: "lost" | "stolen" | "damaged" }
  | { type: "updateTxn"; id: string; patch: { note?: string; category?: SpendCategory } }
  | { type: "readNotices" }
  | { type: "prefs"; patch: Partial<Prefs> }
  | { type: "toggleHide" }
  | { type: "joinWaitlist"; product: string }
  | { type: "saveGoal"; goal: GoalValues & { id?: string } }
  | { type: "deleteGoal"; id: string }
  | { type: "saveBill"; bill: BillValues & { id?: string } }
  | { type: "deleteBill"; id: string }
  | { type: "removePayee"; id: string };

function perform(action: Action, state: BankState): Promise<ActionResult> {
  switch (action.type) {
    case "transfer":
      return transferMoney(action);
    case "send":
      return sendMoney(action);
    case "payBill":
      return payBill(action);
    case "addToGoal":
      return addToGoal(action);
    case "card":
      return updateCard(action.patch);
    case "replaceCard":
      return replaceCard(action.reason);
    case "updateTxn":
      return updateTransaction(action.id, action.patch);
    case "readNotices":
      return markNotificationsRead();
    case "prefs":
      return updateSettings(action.patch);
    case "toggleHide":
      return updateSettings({ hideBalances: !state.hideBalances });
    case "joinWaitlist":
      return joinLoanWaitlistInApp(action.product);
    case "saveGoal":
      return saveGoal(action.goal);
    case "deleteGoal":
      return deleteGoal(action.id);
    case "saveBill":
      return saveBill(action.bill);
    case "deleteBill":
      return deleteBill(action.id);
    case "removePayee":
      return removeMyPayee(action.id);
  }
}

/** What the screen shows while the server confirms. Money movements wait for the server instead. */
function optimistic(state: BankState, action: Action): BankState {
  switch (action.type) {
    case "card":
      return state.card ? { ...state, card: { ...state.card, ...action.patch } } : state;
    case "updateTxn":
      return { ...state, txns: state.txns.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)) };
    case "readNotices":
      return { ...state, notices: state.notices.map((n) => ({ ...n, read: true })) };
    case "prefs":
      return { ...state, prefs: { ...state.prefs, ...action.patch } };
    case "toggleHide":
      return { ...state, hideBalances: !state.hideBalances };
    case "joinWaitlist":
      return state.loanWaitlist.includes(action.product) ? state : { ...state, loanWaitlist: [...state.loanWaitlist, action.product] };
    case "deleteGoal":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case "deleteBill":
      return { ...state, bills: state.bills.filter((b) => b.id !== action.id) };
    case "removePayee":
      return { ...state, payees: state.payees.filter((p) => p.id !== action.id) };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ store */

type Store = {
  state: BankState;
  /** Fire and forget: errors are shown as a toast. */
  dispatch: (action: Action) => void;
  /** Await the server's answer, e.g. to show a success screen. */
  run: (action: Action) => Promise<ActionResult>;
};

const BankContext = createContext<Store | null>(null);

export function useBank() {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error("useBank must be used inside <BankProvider>");
  return ctx;
}

export function BankProvider({ bank, profileId, children }: { bank: BankState; profileId: string; children: React.ReactNode }) {
  const router = useRouter();
  const [state, applyOptimistic] = useOptimistic(bank, optimistic);
  const [, startTransition] = useTransition();
  const lastOwnAction = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const run = useCallback(
    (action: Action) =>
      new Promise<ActionResult>((resolve) => {
        lastOwnAction.current = Date.now();
        startTransition(async () => {
          applyOptimistic(action);
          let result: ActionResult;
          try {
            result = await perform(action, stateRef.current);
          } catch {
            result = { ok: false, message: "We couldn’t reach the bank. Check your connection and try again." };
          }
          if (!result.ok) toast.error(result.message);
          resolve(result);
        });
      }),
    [applyOptimistic],
  );

  const dispatch = useCallback((action: Action) => void run(action), [run]);

  // Live updates: a deposit posted by the bank, or any new notification, refreshes the page.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 250);
    };
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    (async () => {
      // Load the session from the cookie first, so Realtime joins as this customer
      // (row level security then lets their own changes through). Joining too early
      // would connect anonymously and receive nothing.
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`bank-${profileId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
          (payload: { new: Record<string, unknown> }) => {
            const n = payload.new as { title: string; body: string };
            // Your own actions already show a confirmation; only announce what happened elsewhere.
            if (Date.now() - lastOwnAction.current > 5000) toast(n.title, { description: n.body });
            refresh();
          },
        )
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "accounts" }, refresh)
        .subscribe();
    })();

    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [profileId, router]);

  const value = useMemo(() => ({ state, dispatch, run }), [state, dispatch, run]);
  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}
