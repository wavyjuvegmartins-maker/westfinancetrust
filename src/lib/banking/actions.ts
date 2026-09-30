"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/actions";
import type { CardState, Prefs, SpendCategory } from "@/components/dashboard/data";
import { getSessionUser } from "@/lib/auth/session";
import { deliverEmailsSoon } from "@/lib/email/outbox";
import { billSchema, goalSchema, loanTypes, type BillValues, type GoalValues } from "@/lib/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Every customer action: check the session, act through row level security or
// the tested database functions, then refresh the dashboard's data.

async function customer() {
  const user = await getSessionUser();
  if (!user || user.role !== "customer" || user.mustChangePassword) return null;
  return { user, supabase: await createSupabaseServerClient() };
}

const signedOut: ActionResult = { ok: false, message: "Your session has ended. Log in again to continue." };

function done(message: string): ActionResult {
  revalidatePath("/dashboard", "layout");
  deliverEmailsSoon(); // money movements and card changes can create notifications
  return { ok: true, message };
}

/** Database errors raised by our functions are already written for customers. */
function failed(error: { message: string; code?: string }): ActionResult {
  const friendly = ["P0001", "P0002", "42501", "22023"].includes(error.code ?? "");
  return { ok: false, message: friendly ? error.message : "That didn’t go through. Try again in a moment." };
}

const validAmount = (n: number) => Number.isFinite(n) && n > 0 && n <= 25_000;

export async function transferMoney(input: { from: string; to: string; amount: number; note?: string }): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  if (!validAmount(input.amount)) return { ok: false, message: "Enter an amount between $0.01 and $25,000." };
  const { error } = await ctx.supabase.rpc("transfer_between_accounts", {
    p_from: input.from,
    p_to: input.to,
    p_amount: input.amount,
    p_note: input.note || null,
  });
  return error ? failed(error) : done("Transfer complete");
}

export async function sendMoney(input: { from: string; payeeId: string; amount: number; note?: string }): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  if (!validAmount(input.amount)) return { ok: false, message: "Enter an amount between $0.01 and $25,000." };
  const { error } = await ctx.supabase.rpc("send_to_payee", {
    p_from: input.from,
    p_payee: input.payeeId,
    p_amount: input.amount,
    p_note: input.note || null,
  });
  return error ? failed(error) : done("Payment sent");
}

export async function payBill(input: { billId: string; from: string }): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const { error } = await ctx.supabase.rpc("pay_bill", { p_from: input.from, p_bill: input.billId });
  return error ? failed(error) : done("Bill paid");
}

export async function addToGoal(input: { goalId: string; from: string; amount: number }): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  if (!validAmount(input.amount)) return { ok: false, message: "Enter an amount between $0.01 and $25,000." };
  const { error } = await ctx.supabase.rpc("add_to_goal", { p_goal: input.goalId, p_from: input.from, p_amount: input.amount });
  return error ? failed(error) : done("Added to your goal");
}

export async function updateCard(patch: Partial<Pick<CardState, "frozen" | "online" | "contactless" | "atm" | "abroad" | "dailyLimit">>): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const columns: Record<string, unknown> = {};
  if (patch.frozen !== undefined) columns.status = patch.frozen ? "frozen" : "active";
  if (patch.online !== undefined) columns.online_payments = patch.online;
  if (patch.contactless !== undefined) columns.contactless = patch.contactless;
  if (patch.atm !== undefined) columns.atm_withdrawals = patch.atm;
  if (patch.abroad !== undefined) columns.use_abroad = patch.abroad;
  if (patch.dailyLimit !== undefined) {
    if (!(patch.dailyLimit >= 100 && patch.dailyLimit <= 5000)) return { ok: false, message: "Choose a daily limit between $100 and $5,000." };
    columns.daily_limit = patch.dailyLimit;
  }
  const { data, error } = await ctx.supabase
    .from("cards")
    .update(columns)
    .eq("holder_id", ctx.user.id)
    .neq("status", "cancelled")
    .select("id");
  if (error) return failed(error);
  if (!data?.length) return { ok: false, message: "We couldn’t find an active card on your account." };
  return done("Card updated");
}

/**
 * Cancels the current card and records a replacement. Until a card processor is
 * connected, the new card's last four digits are generated here.
 */
export async function replaceCard(reason: "lost" | "stolen" | "damaged"): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const admin = createSupabaseAdminClient();
  const { data: current } = await admin
    .from("cards")
    .select("id, account_id")
    .eq("holder_id", ctx.user.id)
    .neq("status", "cancelled")
    .maybeSingle<{ id: string; account_id: string }>();
  if (!current) return { ok: false, message: "We couldn’t find an active card to replace." };

  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 4);
  const last4 = String(Math.floor(1000 + Math.random() * 9000));

  const { error: cancelError } = await admin.from("cards").update({ status: "cancelled" }).eq("id", current.id);
  if (cancelError) return failed(cancelError);
  const { error } = await admin.from("cards").insert({
    account_id: current.account_id,
    holder_id: ctx.user.id,
    last4,
    expiry_month: expires.getMonth() + 1,
    expiry_year: expires.getFullYear(),
  });
  if (error) return failed(error);

  await admin.from("notifications").insert({
    profile_id: ctx.user.id,
    kind: "security",
    title: "Replacement card ordered",
    body: `Your old card is cancelled. The new card ending ${last4} arrives in 3 to 5 business days.`,
  });
  await admin.from("audit_log").insert({
    actor_id: ctx.user.id,
    action: "replace_card",
    target_type: "card",
    target_id: current.id,
    details: { reason, new_last4: last4 },
  });
  return done("Replacement ordered");
}

export async function updateTransaction(id: string, patch: { note?: string; category?: SpendCategory }): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const columns: Record<string, unknown> = {};
  if (patch.note !== undefined) columns.note = patch.note.trim().slice(0, 60) || null;
  if (patch.category !== undefined) columns.category = patch.category;
  const { error } = await ctx.supabase.from("transactions").update(columns).eq("id", id);
  return error ? failed(error) : done("Saved");
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const { error } = await ctx.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", ctx.user.id)
    .is("read_at", null);
  return error ? failed(error) : done("Marked as read");
}

export async function updateSettings(patch: Partial<Prefs> & { hideBalances?: boolean }): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const columns: Record<string, unknown> = {};
  if (patch.largePayments !== undefined) columns.card_payment_alerts = patch.largePayments;
  if (patch.lowBalance !== undefined) columns.low_balance_alerts = patch.lowBalance;
  if (patch.loginAlerts !== undefined) columns.login_alerts = patch.loginAlerts;
  if (patch.weeklySummary !== undefined) columns.weekly_summary = patch.weeklySummary;
  if (patch.activityEmails !== undefined) columns.activity_emails = patch.activityEmails;
  if (patch.hideBalances !== undefined) columns.hide_balances = patch.hideBalances;
  const { error } = await ctx.supabase.from("user_settings").update(columns).eq("profile_id", ctx.user.id);
  return error ? failed(error) : done("Settings saved");
}

export async function joinLoanWaitlistInApp(product: string): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  if (!(loanTypes as readonly string[]).includes(product)) return { ok: false, message: "Choose a loan type." };
  const { error } = await ctx.supabase.from("loan_waitlist").insert({ product, profile_id: ctx.user.id });
  if (error && error.code !== "23505") return failed(error);
  return done("You’re on the waitlist");
}

/* ------------------------------------------------------------------ goals */

export async function saveGoal(input: GoalValues & { id?: string }): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the goal and try again." };

  if (input.id) {
    // Name and target only: the amount saved changes through add_to_goal.
    const { error } = await ctx.supabase
      .from("savings_goals")
      .update({ name: parsed.data.name, target: parsed.data.target })
      .eq("id", input.id)
      .eq("owner_id", ctx.user.id);
    return error ? failed(error) : done("Goal updated");
  }

  const { data: account } = await ctx.supabase.from("accounts").select("type").eq("id", parsed.data.accountId).maybeSingle<{ type: string }>();
  if (account?.type !== "savings") return { ok: false, message: "Goals live in a savings account. Choose one of yours." };
  const { error } = await ctx.supabase
    .from("savings_goals")
    .insert({ owner_id: ctx.user.id, account_id: parsed.data.accountId, name: parsed.data.name, target: parsed.data.target });
  return error ? failed(error) : done("Goal created");
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const { error } = await ctx.supabase.from("savings_goals").delete().eq("id", id).eq("owner_id", ctx.user.id);
  return error ? failed(error) : done("Goal deleted");
}

/* ------------------------------------------------------------------ bills */

export async function saveBill(input: BillValues & { id?: string }): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const parsed = billSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the bill and try again." };
  const v = parsed.data;
  const row = {
    name: v.name,
    amount: v.amount,
    due_day: v.dueDay,
    category: v.category,
    autopay: v.autopay,
    pay_from: v.autopay && v.payFrom ? v.payFrom : null,
  };
  const { error } = input.id
    ? await ctx.supabase.from("bills").update(row).eq("id", input.id).eq("owner_id", ctx.user.id)
    : await ctx.supabase.from("bills").insert({ ...row, owner_id: ctx.user.id });
  if (error) {
    // Row level security refuses an autopay account that isn't the customer's.
    if (error.code === "42501") return { ok: false, message: "Autopay can only use an account you can pay from." };
    return failed(error);
  }
  return done(input.id ? "Bill updated" : "Bill added");
}

export async function deleteBill(id: string): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const { error } = await ctx.supabase.from("bills").delete().eq("id", id).eq("owner_id", ctx.user.id);
  return error ? failed(error) : done("Bill removed");
}

/* ----------------------------------------------------------------- payees */

/** Customers can remove a payee themselves. Adding one goes through staff. */
export async function removeMyPayee(id: string): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const { data, error } = await ctx.supabase.from("payees").delete().eq("id", id).eq("owner_id", ctx.user.id).select("name, account_mask");
  if (error) return failed(error);
  const removed = data?.[0];
  if (!removed) return { ok: false, message: "That payee has already been removed." };
  const admin = createSupabaseAdminClient();
  await admin.from("audit_log").insert({
    actor_id: ctx.user.id,
    action: "customer_remove_payee",
    target_type: "profile",
    target_id: ctx.user.id,
    details: { name: removed.name, account_mask: removed.account_mask },
  });
  return done("Payee removed");
}

export async function signOutOtherDevices(): Promise<ActionResult> {
  const ctx = await customer();
  if (!ctx) return signedOut;
  const { error } = await ctx.supabase.auth.signOut({ scope: "others" });
  return error ? failed(error) : { ok: true, message: "Signed out everywhere else" };
}
