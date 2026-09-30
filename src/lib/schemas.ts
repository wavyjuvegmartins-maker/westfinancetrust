import { z } from "zod";

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
});
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
