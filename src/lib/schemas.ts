import { z } from "zod";
import { assetMeta, cryptoAddressProblem, cryptoAssets, cryptoNetworks, fitsDecimals, type CryptoAsset } from "@/lib/crypto";

export const loginSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(4, "Enter the user ID from your account welcome pack.")
    .max(64, "User IDs are 64 characters or fewer."),
  password: z.string().min(8, "Passwords are at least 8 characters."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Use at least 12 characters.")
      .max(72, "Use 72 characters or fewer.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don’t match." });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/* ------------------------------------------------------- goals and bills */

export const spendCategoryIds = ["groceries", "dining", "transport", "shopping", "bills", "entertainment", "other"] as const;

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Give your goal a name.").max(40, "Keep the name under 40 characters."),
  target: z
    .number({ error: "Enter how much you want to save." })
    .positive("Enter an amount above $0.")
    .max(10_000_000, "That target is too large."),
  accountId: z.uuid("Choose the savings account for this goal."),
});
export type GoalValues = z.infer<typeof goalSchema>;

export const billSchema = z
  .object({
    name: z.string().trim().min(2, "Enter who the bill is from.").max(60, "Keep the name under 60 characters."),
    amount: z
      .number({ error: "Enter the amount." })
      .positive("Enter an amount above $0.")
      .max(100_000, "That amount is too large for a bill."),
    dueDay: z
      .number({ error: "Choose the day it’s due." })
      .int()
      .min(1, "Choose a day between 1 and 28.")
      .max(28, "Choose a day between 1 and 28, so it’s due every month."),
    category: z.enum(spendCategoryIds),
    autopay: z.boolean(),
    payFrom: z.string(),
  })
  .refine((v) => !v.autopay || v.payFrom !== "", { path: ["payFrom"], message: "Choose the account autopay should use." });
export type BillValues = z.infer<typeof billSchema>;

/* ---------------------------------------------------------------- admin */

export const accountTypes = ["checking", "savings", "certificate"] as const;

const money = (label: string) =>
  z
    .number({ error: `Enter the ${label}.` })
    .min(0, `The ${label} can’t be negative.`)
    .max(10_000_000, `The ${label} is too large to post online.`);

export const registerCustomerSchema = z.object({
  firstName: z.string().trim().min(1, "Enter the first name.").max(60),
  lastName: z.string().trim().min(1, "Enter the last name.").max(60),
  email: z.email("Enter an email address like name@example.com.").transform((e) => e.toLowerCase()),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s-]{7,20}$/, "Use digits, spaces and + ( ) - only.")
    .or(z.literal("")),
  branch: z.string().trim().min(1, "Enter the home branch.").max(80),
  userId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{4,64}$/, "4 to 64 characters: lowercase letters, numbers, dots, dashes or underscores."),
  accounts: z
    .array(
      z.object({
        type: z.enum(accountTypes),
        openingDeposit: money("opening deposit"),
      }),
    )
    .min(1, "Open at least one account."),
});
export type RegisterCustomerValues = z.infer<typeof registerCustomerSchema>;

export const cashMovementSchema = z.object({
  accountId: z.uuid(),
  amount: z
    .number({ error: "Enter an amount." })
    .positive("Enter an amount above $0.")
    .max(10_000_000, "That amount is too large to post online."),
  description: z.string().trim().min(3, "Describe the transaction, for example Cash deposit at branch.").max(80),
  // Deposits only: who paid the money in, and when they sent it. All optional.
  payerName: z
    .string()
    .trim()
    .max(80, "Keep the payer’s name under 80 characters.")
    .refine((s) => s === "" || s.length >= 2, "Enter the payer’s full name.")
    .optional(),
  payerType: z.enum(["person", "organization"]).optional(),
  paidOn: z
    .string()
    .refine((s) => s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s), "Pick a date.")
    // A day of slack covers staff in time zones ahead of the server.
    .refine((s) => s === "" || new Date(`${s}T00:00:00Z`).getTime() <= Date.now() + 86_400_000, "The date sent can’t be in the future.")
    .optional(),
}).refine((v) => !v.payerName || !!v.payerType, { path: ["payerType"], message: "Is the payer a person or an organization?" });
export type CashMovementValues = z.infer<typeof cashMovementSchema>;

/** US routing numbers carry a 3-7-1 weighted checksum, which catches most typos. */
export const isValidRoutingNumber = (n: string) => {
  if (!/^\d{9}$/.test(n)) return false;
  const d = n.split("").map(Number);
  return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10 === 0;
};

const digitsOnly = (s: string) => s.replace(/[\s-]/g, "");

export const payeeSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the name on the payee’s account.").max(60),
    bankName: z.string().trim().min(2, "Enter the payee’s bank.").max(60),
    routingNumber: z
      .string()
      .transform(digitsOnly)
      .refine((v) => /^\d{9}$/.test(v), "Routing numbers are 9 digits.")
      .refine(isValidRoutingNumber, "That routing number isn’t valid. Check it with the customer."),
    accountNumber: z
      .string()
      .transform(digitsOnly)
      .refine((v) => /^\d{4,17}$/.test(v), "Account numbers are 4 to 17 digits."),
    confirmAccountNumber: z.string().transform(digitsOnly),
    addedVia: z.enum(["phone", "branch"], { error: "Choose how the customer asked." }),
    verified: z.literal(true, { error: "Confirm you’ve checked who you’re speaking to." }),
  })
  .superRefine(
    (v, ctx) => {
      if (v.accountNumber !== v.confirmAccountNumber) {
        ctx.addIssue({ code: "custom", path: ["confirmAccountNumber"], message: "The account numbers don’t match. Read it back to the customer." });
      }
    },
    {
      // Compare the two numbers even while another field is still wrong, so every problem shows at once.
      when: (payload) => {
        const v = payload.value as { accountNumber?: unknown; confirmAccountNumber?: unknown } | undefined;
        return typeof v?.accountNumber === "string" && typeof v?.confirmAccountNumber === "string" && v.confirmAccountNumber !== "";
      },
    },
  );
export type PayeeInput = z.input<typeof payeeSchema>;
export type PayeeValues = z.output<typeof payeeSchema>;

export const loanTypes = ["personal", "auto", "home", "business"] as const;

export const waitlistSchema = z.object({
  email: z.email("Enter an email address like name@example.com."),
  product: z.enum(loanTypes, { error: "Choose the loan you’re interested in." }),
});
export type WaitlistValues = z.infer<typeof waitlistSchema>;

export const contactTopics = [
  { value: "open-account", label: "Opening an account" },
  { value: "online-banking", label: "Online banking and login" },
  { value: "cards", label: "Cards" },
  { value: "business", label: "Business banking" },
  { value: "loans", label: "Loans" },
  { value: "other", label: "Something else" },
] as const;

const topicValues = contactTopics.map((t) => t.value) as [
  (typeof contactTopics)[number]["value"],
  ...(typeof contactTopics)[number]["value"][],
];

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.email("Enter an email address like name@example.com."),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s-]{7,20}$/, "Use digits, spaces and + ( ) - only, or leave this empty.")
    .or(z.literal("")),
  topic: z.enum(topicValues, { error: "Choose what your message is about." }),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more, at least 10 characters.")
    .max(2000, "Keep your message under 2,000 characters."),
});
export type ContactValues = z.infer<typeof contactSchema>;

/* ------------------------------------------------------------------ crypto */

const cryptoAmount = z
  .number({ error: "Enter an amount." })
  .positive("Enter an amount above zero.")
  .max(100_000_000, "That amount is too large.");

const decimalsMessage = (asset: CryptoAsset) => `${assetMeta[asset].symbol} amounts have up to ${assetMeta[asset].decimals} decimal places.`;

/** Staff setting the address a customer deposits to, or the one their withdrawals go to. */
export const cryptoAddressSchema = z
  .object({
    asset: z.enum(cryptoAssets),
    side: z.enum(["deposit", "withdrawal"]),
    network: z.enum(cryptoNetworks, { error: "Choose the network." }),
    address: z.string().trim().min(1, "Enter the address."),
    confirmAddress: z.string().trim().optional(),
    tag: z.string().trim().optional(),
    // Withdrawal addresses only: who asked, and that staff checked it was them.
    addedVia: z.enum(["phone", "branch"]).optional(),
    verified: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    const problem = cryptoAddressProblem(v.asset, v.network, v.address, v.tag || null);
    if (problem) {
      const path = /network/.test(problem) && /can’t be sent/.test(problem) ? "network" : /tag/.test(problem) ? "tag" : "address";
      ctx.addIssue({ code: "custom", path: [path], message: problem });
    }
    if (v.side === "withdrawal") {
      if (v.confirmAddress !== v.address) {
        ctx.addIssue({ code: "custom", path: ["confirmAddress"], message: "The addresses don’t match. Read it back to the customer." });
      }
      if (!v.addedVia) ctx.addIssue({ code: "custom", path: ["addedVia"], message: "Choose how the customer asked." });
      if (v.verified !== true) ctx.addIssue({ code: "custom", path: ["verified"], message: "Confirm you’ve checked who you’re speaking to." });
    }
  });
export type CryptoAddressValues = z.infer<typeof cryptoAddressSchema>;

/** Staff crediting or debiting a wallet straight away. */
export const cryptoPostSchema = z
  .object({
    asset: z.enum(cryptoAssets),
    amount: cryptoAmount,
    description: z.string().trim().min(3, "Describe it, for example BTC deposit received.").max(80),
  })
  .refine((v) => fitsDecimals(v.amount, v.asset), { path: ["amount"], error: (iss) => decimalsMessage((iss.input as { asset: CryptoAsset }).asset) });
export type CryptoPostValues = z.infer<typeof cryptoPostSchema>;

/** A customer saying they've sent a deposit, or asking to withdraw. */
export const cryptoRequestSchema = z
  .object({
    asset: z.enum(cryptoAssets),
    amount: cryptoAmount,
    note: z.string().trim().max(60, "Keep the note under 60 characters.").optional(),
  })
  .refine((v) => fitsDecimals(v.amount, v.asset), { path: ["amount"], error: (iss) => decimalsMessage((iss.input as { asset: CryptoAsset }).asset) });
export type CryptoRequestValues = z.infer<typeof cryptoRequestSchema>;

/* -------------------------------------------------- transfers to other banks */

/** Spaces and dashes people paste with account numbers, removed. Letters upper-cased for IBANs and SWIFT codes. */
export const compactAccount = (s: string) => s.replace(/[\s-]/g, "").toUpperCase();

/** IBANs end in a mod-97 check, which catches nearly every typo. */
export const isValidIban = (raw: string) => {
  const iban = compactAccount(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
};

/** Looks like an IBAN (country letters then check digits), so it gets the IBAN check. */
export const looksLikeIban = (raw: string) => /^[A-Z]{2}\d{2}/.test(compactAccount(raw));

export const swiftPattern = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

/**
 * A customer sending money to someone at another bank. Shared by the form and the
 * server action; the database checks the same rules again
 * (request_external_transfer in supabase/migrations/20261107000001_external_transfers.sql).
 */
export const externalTransferSchema = z
  .object({
    scope: z.enum(["domestic", "international"]),
    from: z.string().min(1, "Choose an account to pay from."),
    amount: z
      .number({ error: "Enter an amount." })
      .positive("Enter an amount above $0.")
      .max(25_000, "Online transfers are limited to $25,000. Call us for larger amounts.")
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Use dollars and cents only."),
    recipientName: z.string().trim().min(2, "Enter the name on the recipient’s account.").max(80, "Keep the name under 80 characters."),
    bankName: z.string().trim().min(2, "Enter the recipient’s bank.").max(80, "Keep the bank name under 80 characters."),
    accountNumber: z.string(),
    confirmAccountNumber: z.string(),
    routingNumber: z.string().optional(),
    swiftCode: z.string().optional(),
    bankCountry: z.string().trim().max(60, "Keep the country under 60 characters.").optional(),
    recipientAddress: z.string().trim().max(160, "Keep the address under 160 characters.").optional(),
    note: z.string().trim().max(60, "Keep the note under 60 characters.").optional(),
  })
  .superRefine((v, ctx) => {
    const account = compactAccount(v.accountNumber ?? "");
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    if (v.scope === "domestic") {
      const routing = compactAccount(v.routingNumber ?? "");
      if (!/^\d{9}$/.test(routing)) issue("routingNumber", "Routing numbers are 9 digits.");
      else if (!isValidRoutingNumber(routing)) issue("routingNumber", "That routing number isn’t valid. Check it with the recipient.");
      if (!/^\d{4,17}$/.test(account)) issue("accountNumber", "Account numbers are 4 to 17 digits.");
    } else {
      const swift = compactAccount(v.swiftCode ?? "");
      if (!swiftPattern.test(swift)) issue("swiftCode", "SWIFT/BIC codes are 8 or 11 letters and numbers, like DEUTDEFF.");
      if (!/^[A-Z0-9]{4,34}$/.test(account)) issue("accountNumber", "Enter the IBAN or account number, 4 to 34 letters and numbers.");
      else if (looksLikeIban(account) && !isValidIban(account)) issue("accountNumber", "That IBAN isn’t valid. Check it with the recipient.");
      if (!v.bankCountry || v.bankCountry.length < 2) issue("bankCountry", "Enter the country the bank is in.");
      if (!v.recipientAddress || v.recipientAddress.length < 5) issue("recipientAddress", "Enter the recipient’s address. International banks need it.");
    }

    if (account && compactAccount(v.confirmAccountNumber ?? "") !== account) {
      issue("confirmAccountNumber", "The account numbers don’t match. Check them again.");
    }
  }, {
    // Check the bank details even while another field is still wrong, so every problem shows at once.
    when: (payload) => {
      const v = payload.value as { scope?: unknown } | undefined;
      return v?.scope === "domestic" || v?.scope === "international";
    },
  });
export type ExternalTransferValues = z.infer<typeof externalTransferSchema>;
