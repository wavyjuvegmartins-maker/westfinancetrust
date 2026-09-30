"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { generateTemporaryPassword } from "@/lib/admin/password";
import { deliverEmailsSoon } from "@/lib/email/outbox";
import { sendEmail } from "@/lib/email/send";
import { credentialsEmail, loansOpenEmail } from "@/lib/email/templates";
import { certificateApy, savingsApy } from "@/lib/rates";
import {
  accountTypes,
  loanTypes,
  cashMovementSchema,
  payeeSchema,
  registerCustomerSchema,
  type CashMovementValues,
  type PayeeInput,
  type RegisterCustomerValues,
} from "@/lib/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Credentials = { userId: string; password: string; email: string; emailed: boolean; emailProblem?: string };
export type AdminResult = { ok: boolean; message: string; customerId?: string; credentials?: Credentials };

const notAllowed: AdminResult = { ok: false, message: "Only staff can do that. Log in with a staff account." };

/** Staff only; `adminOnly` for money movements and account changes. */
async function staff(adminOnly = false) {
  const user = await getSessionUser();
  if (!user || user.mustChangePassword || user.role === "customer") return null;
  if (adminOnly && user.role !== "admin") return null;
  return { user, supabase: await createSupabaseServerClient() };
}

function friendly(error: { message: string; code?: string }, fallback: string) {
  return ["P0001", "P0002", "42501", "22023"].includes(error.code ?? "") ? error.message : fallback;
}

const defaultNames = { checking: "Everyday Checking", savings: "High-Yield Savings", certificate: "12-month Certificate" } as const;

/** Opens one account through the audited database function, and issues a card with checking. */
async function openAccount(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  profileId: string,
  type: (typeof accountTypes)[number],
  openingDeposit: number,
) {
  const maturity = new Date();
  maturity.setFullYear(maturity.getFullYear() + 1);
  const { data, error } = await supabase
    .rpc("admin_open_account", {
      p_profile: profileId,
      p_type: type,
      p_name: defaultNames[type],
      p_apy: type === "savings" ? savingsApy : type === "certificate" ? certificateApy : null,
      p_matures_on: type === "certificate" ? maturity.toISOString().slice(0, 10) : null,
      p_opening_deposit: openingDeposit,
    })
    .single<{ id: string; account_number: string }>();
  if (error || !data) return { error: error ?? { message: "The account wasn’t created." } };

  if (type === "checking") {
    // Until a card processor is connected, the card record is created here with a placeholder number.
    const admin = createSupabaseAdminClient();
    const { data: existing } = await admin.from("cards").select("id").eq("holder_id", profileId).neq("status", "cancelled").limit(1);
    if (!existing?.length) {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 4);
      await admin.from("cards").insert({
        account_id: data.id,
        holder_id: profileId,
        last4: String(Math.floor(1000 + Math.random() * 9000)),
        expiry_month: expires.getMonth() + 1,
        expiry_year: expires.getFullYear(),
      });
    }
  }
  return { account: data };
}

/* ------------------------------------------------------------ registration */

export async function registerCustomer(values: RegisterCustomerValues): Promise<AdminResult> {
  const ctx = await staff();
  if (!ctx) return notAllowed;
  const parsed = registerCustomerSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const v = parsed.data;
  if (ctx.user.role !== "admin" && v.accounts.some((a) => a.openingDeposit > 0)) {
    return { ok: false, message: "Only an admin can post opening deposits. Set them to $0 or ask an admin." };
  }

  const admin = createSupabaseAdminClient();

  // Login IDs and emails must be unique.
  const [{ data: idTaken }, { data: emailTaken }] = await Promise.all([
    admin.from("profiles").select("id").eq("user_id", v.userId).maybeSingle(),
    admin.from("profiles").select("id").eq("email", v.email).maybeSingle(),
  ]);
  if (idTaken) return { ok: false, message: `The login ID “${v.userId}” is already in use. Try another.` };
  if (emailTaken) return { ok: false, message: `There’s already a customer with ${v.email}.` };

  // 1. The login itself, with a one-time password.
  const password = generateTemporaryPassword();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: v.email,
    password,
    email_confirm: true,
    app_metadata: { role: "customer" },
  });
  if (authError || !created.user) {
    const exists = /already|registered|exists/i.test(authError?.message ?? "");
    return { ok: false, message: exists ? `A login already exists for ${v.email}.` : "The login couldn’t be created. Try again." };
  }
  const id = created.user.id;

  // 2. The profile. If it fails, remove the login so nothing is left half-made.
  const { error: profileError } = await admin.from("profiles").insert({
    id,
    user_id: v.userId,
    first_name: v.firstName,
    last_name: v.lastName,
    email: v.email,
    phone: v.phone || null,
    branch: v.branch,
    role: "customer",
    must_change_password: true,
    created_by: ctx.user.id,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(id);
    return { ok: false, message: "The customer couldn’t be saved, so nothing was created. Try again." };
  }
  await admin.from("audit_log").insert({
    actor_id: ctx.user.id,
    action: "register_customer",
    target_type: "profile",
    target_id: id,
    details: { user_id: v.userId, email: v.email, accounts: v.accounts.map((a) => a.type) },
  });

  // 3. Accounts, opened as the admin so the audit trail shows who did it.
  const problems: string[] = [];
  for (const account of v.accounts) {
    const result = await openAccount(ctx.supabase, id, account.type, account.openingDeposit);
    if (result.error) problems.push(`${defaultNames[account.type]}: ${friendly(result.error, "not opened")}`);
  }

  // 4. Email the login details (and any opening-deposit notifications after it).
  const email = await sendEmail({ to: v.email, ...credentialsEmail({ firstName: v.firstName, userId: v.userId, password, kind: "welcome" }) });
  deliverEmailsSoon();

  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message: problems.length
      ? `Customer registered, but some accounts need attention: ${problems.join("; ")}.`
      : `${v.firstName} ${v.lastName} is registered.`,
    customerId: id,
    credentials: { userId: v.userId, password, email: v.email, emailed: email.sent, emailProblem: email.reason },
  };
}

/** A new one-time password, for a customer who's forgotten theirs (after checking who they are). */
export async function resetCustomerPassword(profileId: string): Promise<AdminResult> {
  const ctx = await staff(true);
  if (!ctx) return notAllowed;
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, first_name, email, role")
    .eq("id", profileId)
    .maybeSingle<{ user_id: string; first_name: string; email: string; role: string }>();
  if (!profile || profile.role !== "customer") return { ok: false, message: "Customer not found." };

  const password = generateTemporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(profileId, { password });
  if (error) return { ok: false, message: "The password couldn’t be reset. Try again." };
  await admin.from("profiles").update({ must_change_password: true }).eq("id", profileId);
  await admin.from("audit_log").insert({ actor_id: ctx.user.id, action: "reset_password", target_type: "profile", target_id: profileId, details: {} });
  await admin.from("notifications").insert({
    profile_id: profileId,
    kind: "security",
    title: "Password reset",
    body: "Your password was reset by our team. If you didn’t ask for this, call us straight away.",
    email_status: "skipped",
  });

  // The password email carries the news itself, so the "Password reset" notification isn't emailed too.
  const email = await sendEmail({ to: profile.email, ...credentialsEmail({ firstName: profile.first_name, userId: profile.user_id, password, kind: "reset" }) });
  revalidatePath(`/admin/customers/${profileId}`);
  return {
    ok: true,
    message: "Password reset.",
    credentials: { userId: profile.user_id, password, email: profile.email, emailed: email.sent, emailProblem: email.reason },
  };
}

/** Suspending blocks sign-in at once; reactivating lets them back in. */
export async function setCustomerStatus(profileId: string, status: "active" | "suspended"): Promise<AdminResult> {
  const ctx = await staff(true);
  if (!ctx) return notAllowed;
  if (profileId === ctx.user.id) return { ok: false, message: "You can’t suspend your own login." };
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update({ status }).eq("id", profileId).eq("role", "customer");
  if (error) return { ok: false, message: "The status couldn’t be changed. Try again." };
  // A ban also ends their current sessions the next time the token refreshes.
  await admin.auth.admin.updateUserById(profileId, { ban_duration: status === "suspended" ? "876000h" : "none" });
  await admin.from("audit_log").insert({ actor_id: ctx.user.id, action: status === "suspended" ? "suspend" : "reactivate", target_type: "profile", target_id: profileId, details: {} });
  revalidatePath("/admin", "layout");
  return { ok: true, message: status === "suspended" ? "Customer suspended. They can’t sign in." : "Customer reactivated." };
}

/* ------------------------------------------------------------ accounts, money */

export async function openAdditionalAccount(profileId: string, type: (typeof accountTypes)[number], openingDeposit: number): Promise<AdminResult> {
  const ctx = await staff();
  if (!ctx) return notAllowed;
  if (!accountTypes.includes(type)) return { ok: false, message: "Choose an account type." };
  if (!(openingDeposit >= 0)) return { ok: false, message: "The opening deposit can’t be negative." };
  if (openingDeposit > 0 && ctx.user.role !== "admin") return { ok: false, message: "Only an admin can post opening deposits." };
  const result = await openAccount(ctx.supabase, profileId, type, openingDeposit);
  if (result.error) return { ok: false, message: friendly(result.error, "The account couldn’t be opened. Try again.") };
  deliverEmailsSoon();
  revalidatePath(`/admin/customers/${profileId}`);
  return { ok: true, message: `${defaultNames[type]} opened, number ${result.account!.account_number}.` };
}

/** Cash in or out at the branch. Posted through the audited database functions. */
export async function postCash(kind: "deposit" | "withdrawal", values: CashMovementValues): Promise<AdminResult> {
  const ctx = await staff(true);
  if (!ctx) return { ok: false, message: "Only an admin can post deposits and withdrawals." };
  const parsed = cashMovementSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the amount and try again." };

  const { error } = await ctx.supabase.rpc(kind === "deposit" ? "admin_deposit" : "admin_withdrawal", {
    p_account: parsed.data.accountId,
    p_amount: parsed.data.amount,
    p_description: parsed.data.description,
  });
  if (error) return { ok: false, message: friendly(error, `The ${kind} didn’t go through. Try again.`) };
  deliverEmailsSoon();
  revalidatePath("/admin", "layout");
  return { ok: true, message: kind === "deposit" ? "Deposit posted." : "Withdrawal posted." };
}

export async function addPayee(profileId: string, values: PayeeInput): Promise<AdminResult> {
  const ctx = await staff();
  if (!ctx) return notAllowed;
  const parsed = payeeSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the payee details." };
  const v = parsed.data;
  const admin = createSupabaseAdminClient();

  const { data: customer } = await admin.from("profiles").select("id").eq("id", profileId).eq("role", "customer").maybeSingle();
  if (!customer) return { ok: false, message: "Customer not found." };
  const { data: duplicate } = await admin
    .from("payees")
    .select("id")
    .eq("owner_id", profileId)
    .eq("routing_number", v.routingNumber)
    .eq("account_number", v.accountNumber)
    .maybeSingle();
  if (duplicate) return { ok: false, message: "This customer can already pay that account." };

  const mask = v.accountNumber.slice(-4);
  const { error } = await admin.from("payees").insert({
    owner_id: profileId,
    name: v.name,
    bank_name: v.bankName,
    routing_number: v.routingNumber,
    account_number: v.accountNumber,
    account_mask: mask,
    added_via: v.addedVia,
    added_by: ctx.user.id,
  });
  if (error) return { ok: false, message: "The payee couldn’t be added. Try again." };

  // Tell the customer, so a payee added by someone impersonating them gets noticed fast.
  await admin.from("notifications").insert({
    profile_id: profileId,
    kind: "security",
    title: "New payee added",
    body: `${v.name} (${v.bankName} ••${mask}) can now receive payments from you. If you didn’t ask for this, call us straight away.`,
  });
  await admin.from("audit_log").insert({
    actor_id: ctx.user.id,
    action: "add_payee",
    target_type: "profile",
    target_id: profileId,
    details: { name: v.name, bank: v.bankName, account_mask: mask, routing_number: v.routingNumber, added_via: v.addedVia },
  });
  deliverEmailsSoon();
  revalidatePath(`/admin/customers/${profileId}`);
  return { ok: true, message: `${v.name} added. The customer has been notified.` };
}

/** Removes a payee from a customer's list, e.g. when they call to ask. */
export async function removePayee(payeeId: string): Promise<AdminResult> {
  const ctx = await staff();
  if (!ctx) return notAllowed;
  const admin = createSupabaseAdminClient();
  const { data: payee } = await admin
    .from("payees")
    .select("owner_id, name, bank_name, account_mask")
    .eq("id", payeeId)
    .maybeSingle<{ owner_id: string; name: string; bank_name: string; account_mask: string }>();
  if (!payee) return { ok: false, message: "That payee has already been removed." };
  const { error } = await admin.from("payees").delete().eq("id", payeeId);
  if (error) return { ok: false, message: "The payee couldn’t be removed. Try again." };
  await admin.from("notifications").insert({
    profile_id: payee.owner_id,
    kind: "security",
    title: "Payee removed",
    body: `${payee.name} (${payee.bank_name} ••${payee.account_mask}) was removed from the people you pay.`,
  });
  await admin.from("audit_log").insert({
    actor_id: ctx.user.id,
    action: "remove_payee",
    target_type: "profile",
    target_id: payee.owner_id,
    details: { name: payee.name, account_mask: payee.account_mask },
  });
  deliverEmailsSoon();
  revalidatePath(`/admin/customers/${payee.owner_id}`);
  return { ok: true, message: `${payee.name} removed.` };
}

/** Finds the customer behind an account number, for the quick lookup. */
export async function findAccount(accountNumber: string): Promise<AdminResult> {
  const ctx = await staff();
  if (!ctx) return notAllowed;
  const number = accountNumber.replace(/\D/g, "");
  if (!number) return { ok: false, message: "Enter an account number." };
  const { data } = await ctx.supabase
    .from("accounts")
    .select("id, account_holders(profile_id, relationship)")
    .eq("account_number", number)
    .maybeSingle<{ id: string; account_holders: { profile_id: string; relationship: string }[] }>();
  const holder = data?.account_holders.find((h) => h.relationship === "primary") ?? data?.account_holders[0];
  if (!holder) return { ok: false, message: `No account ${number}.` };
  return { ok: true, message: "Found.", customerId: holder.profile_id };
}

/* ------------------------------------------------------ scheduled jobs, by hand */

/** Pays last month's interest now. The monthly job does this on the 1st; running it twice is harmless. */
export async function postInterestNow(): Promise<AdminResult> {
  const ctx = await staff(true);
  if (!ctx) return { ok: false, message: "Only an admin can post interest." };
  const { data, error } = await ctx.supabase.rpc("post_monthly_interest");
  if (error) return { ok: false, message: friendly(error, "Interest couldn’t be posted. Try again.") };
  const r = data as { month: string; accounts_paid: number; total: number };
  deliverEmailsSoon();
  const month = new Date(`${r.month}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message: r.accounts_paid
      ? `Interest for ${month} paid: ${Number(r.total).toLocaleString("en-US", { style: "currency", currency: "USD" })} across ${r.accounts_paid} account${r.accounts_paid === 1 ? "" : "s"}.`
      : `Interest for ${month} was already paid. Nothing more to do.`,
  };
}

/** Pays today's autopay bills now. The daily job does this at 09:00 UTC. */
export async function runAutopayNow(): Promise<AdminResult> {
  const ctx = await staff(true);
  if (!ctx) return { ok: false, message: "Only an admin can run autopay." };
  const { data, error } = await ctx.supabase.rpc("run_autopay");
  if (error) return { ok: false, message: friendly(error, "Autopay couldn’t run. Try again.") };
  const r = data as { paid: number; failed: number };
  deliverEmailsSoon();
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message:
      r.paid || r.failed
        ? `Autopay: ${r.paid} paid${r.failed ? `, ${r.failed} couldn’t be paid (customers told)` : ""}.`
        : "No autopay bills left to pay today.",
  };
}

export async function markMessageHandled(id: string): Promise<AdminResult> {
  const ctx = await staff();
  if (!ctx) return notAllowed;
  const { error } = await ctx.supabase
    .from("contact_messages")
    .update({ handled_by: ctx.user.id, handled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: "Couldn’t update that message." };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Marked as handled." };
}

/* ------------------------------------------------------------ loan waitlist */

/**
 * Emails everyone on a loan's waitlist who hasn't been told yet that it's open.
 * Each person is emailed once: the entry is marked as it's sent.
 */
export async function emailLoanWaitlist(product: string): Promise<AdminResult> {
  const ctx = await staff(true);
  if (!ctx) return { ok: false, message: "Only an admin can email the waitlist." };
  if (!(loanTypes as readonly string[]).includes(product)) return { ok: false, message: "Choose a loan." };
  const admin = createSupabaseAdminClient();
  const { data: entries } = await admin
    .from("loan_waitlist")
    .select("id, email, profiles(email, status)")
    .eq("product", product)
    .is("notified_at", null)
    .returns<{ id: string; email: string | null; profiles: { email: string; status: string } | null }[]>();
  if (!entries?.length) return { ok: true, message: "Everyone on this waitlist has already been emailed." };

  const content = loansOpenEmail({ product });
  let sent = 0;
  let problem: string | undefined;
  for (const entry of entries) {
    const to = entry.profiles ? (entry.profiles.status === "active" ? entry.profiles.email : null) : entry.email;
    if (to) {
      const result = await sendEmail({ to, ...content, idempotencyKey: `waitlist-${entry.id}` });
      if (!result.sent) {
        problem = result.reason;
        break; // the service is down or not set up: stop, and the rest can be sent later
      }
      sent++;
    }
    await admin.from("loan_waitlist").update({ notified_at: new Date().toISOString() }).eq("id", entry.id);
  }
  await admin.from("audit_log").insert({ actor_id: ctx.user.id, action: "email_waitlist", target_type: "loan_waitlist", target_id: null, details: { product, sent } });
  revalidatePath("/admin/waitlist");
  if (problem) return { ok: sent > 0, message: `${sent} emailed, then it stopped: ${problem} The rest will go when you send again.` };
  return { ok: true, message: `${sent} ${sent === 1 ? "person" : "people"} emailed.` };
}
