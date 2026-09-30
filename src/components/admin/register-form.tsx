"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, UserPlus } from "lucide-react";
import { CredentialsCard } from "@/components/admin/credentials-card";
import { AdminPanel } from "@/components/admin/ui";
import { FormStatus } from "@/components/forms/form-status";
import { inputClass } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registerCustomer, type AdminResult } from "@/lib/admin/actions";
import { certificateApy, formatRate, savingsApy } from "@/lib/rates";
import { registerCustomerSchema, type RegisterCustomerValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const accountOptions = [
  { type: "checking", name: "Everyday Checking", detail: "Comes with a debit card" },
  { type: "savings", name: "High-Yield Savings", detail: `${formatRate(savingsApy)} APY` },
  { type: "certificate", name: "12-month Certificate", detail: `${formatRate(certificateApy)} APY, fixed` },
] as const;

/** Suggests a login ID from the name: first.last, lowercase, letters only. */
const suggestId = (first: string, last: string) =>
  [first, last]
    .map((s) => s.toLowerCase().normalize("NFD").replace(/[^a-z]/g, ""))
    .filter(Boolean)
    .join(".");

export function RegisterCustomerForm({ isAdmin }: { isAdmin: boolean }) {
  const [result, setResult] = useState<AdminResult | null>(null);
  const [idEdited, setIdEdited] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterCustomerValues>({
    resolver: zodResolver(registerCustomerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      branch: "Main branch",
      userId: "",
      accounts: [{ type: "checking", openingDeposit: 0 }],
    },
  });
  const accounts = useWatch({ control, name: "accounts" }) ?? [];

  const onName = (first: string, last: string) => {
    if (!idEdited) setValue("userId", suggestId(first, last), { shouldValidate: false });
  };

  const toggle = (type: (typeof accountOptions)[number]["type"]) => {
    const has = accounts.some((a) => a.type === type);
    setValue("accounts", has ? accounts.filter((a) => a.type !== type) : [...accounts, { type, openingDeposit: 0 }], { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    const res = await registerCustomer(values);
    setResult(res);
    if (res.ok) {
      reset();
      setIdEdited(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  if (result?.ok && result.credentials) {
    return (
      <AdminPanel className="max-w-2xl">
        <h2 className="font-heading text-xl font-semibold text-ink">{result.message}</h2>
        <p className="mt-1 text-slate">Their accounts are open. Here are their login details.</p>
        <div className="mt-5">
          <CredentialsCard credentials={result.credentials} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {result.customerId && (
            <Link
              href={`/admin/customers/${result.customerId}`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-surface hover:bg-ink/85"
            >
              Open customer <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          <Button type="button" variant="outline-ink" size="md" className="h-11" onClick={() => setResult(null)}>
            Register another
          </Button>
        </div>
      </AdminPanel>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <AdminPanel>
        <h2 className="font-heading text-lg font-semibold text-ink">Customer details</h2>
        <p className="mt-0.5 text-sm text-slate">Check them against the customer’s ID before you continue.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="firstName" className="text-ink">First name</FieldLabel>
            <Input id="firstName" autoComplete="off" className={inputClass} aria-invalid={!!errors.firstName} {...register("firstName", { onChange: (e) => onName(e.target.value, getValues("lastName")) })} />
            <FieldError errors={[errors.firstName]} />
          </Field>
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="lastName" className="text-ink">Last name</FieldLabel>
            <Input id="lastName" autoComplete="off" className={inputClass} aria-invalid={!!errors.lastName} {...register("lastName", { onChange: (e) => onName(getValues("firstName"), e.target.value) })} />
            <FieldError errors={[errors.lastName]} />
          </Field>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email" className="text-ink">Email</FieldLabel>
            <Input id="email" type="email" autoComplete="off" className={inputClass} aria-invalid={!!errors.email} {...register("email")} />
            <FieldDescription>Their login details are sent here.</FieldDescription>
            <FieldError errors={[errors.email]} />
          </Field>
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone" className="text-ink">
              Phone <span className="font-normal text-slate">(optional)</span>
            </FieldLabel>
            <Input id="phone" type="tel" autoComplete="off" className={inputClass} aria-invalid={!!errors.phone} {...register("phone")} />
            <FieldError errors={[errors.phone]} />
          </Field>
          <Field data-invalid={!!errors.userId}>
            <FieldLabel htmlFor="userId" className="text-ink">Login ID</FieldLabel>
            <Input id="userId" autoComplete="off" autoCapitalize="none" spellCheck={false} className={inputClass} aria-invalid={!!errors.userId} {...register("userId", { onChange: () => setIdEdited(true) })} />
            <FieldDescription>Suggested from their name. Change it if you like.</FieldDescription>
            <FieldError errors={[errors.userId]} />
          </Field>
          <Field data-invalid={!!errors.branch}>
            <FieldLabel htmlFor="branch" className="text-ink">Home branch</FieldLabel>
            <Input id="branch" className={inputClass} aria-invalid={!!errors.branch} {...register("branch")} />
            <FieldError errors={[errors.branch]} />
          </Field>
        </div>
      </AdminPanel>

      <div className="grid content-start gap-5">
        <AdminPanel>
          <h2 className="font-heading text-lg font-semibold text-ink">Accounts to open</h2>
          <p className="mt-0.5 text-sm text-slate">They’re assigned to this customer straight away.</p>
          <div className="mt-5 grid gap-3">
            {accountOptions.map((o) => {
              const index = accounts.findIndex((a) => a.type === o.type);
              const on = index >= 0;
              return (
                <div key={o.type} className={cn("rounded-2xl p-4 ring-1 transition-colors", on ? "bg-amber-soft/50 ring-amber" : "ring-line")}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={on} onChange={() => toggle(o.type)} className="mt-1 size-4 accent-amber-strong" />
                    <span>
                      <span className="block font-semibold text-ink">{o.name}</span>
                      <span className="text-sm text-slate">{o.detail}</span>
                    </span>
                  </label>
                  {on && (
                    <div className="mt-3 pl-7">
                      <label htmlFor={`deposit-${o.type}`} className="text-sm font-medium text-ink">
                        Opening deposit
                      </label>
                      <div className="relative mt-1">
                        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate">$</span>
                        <input
                          id={`deposit-${o.type}`}
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!isAdmin}
                          className="h-11 w-full rounded-lg border border-input bg-panel pr-3 pl-7 text-base text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-60"
                          {...register(`accounts.${index}.openingDeposit`, { valueAsNumber: true })}
                        />
                      </div>
                      {!isAdmin && <p className="mt-1 text-xs text-slate">Only an admin can post opening deposits.</p>}
                      <FieldError errors={[errors.accounts?.[index]?.openingDeposit]} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {errors.accounts?.message && <p className="mt-2 text-sm text-destructive" role="alert">{errors.accounts.message}</p>}
        </AdminPanel>

        <FormStatus result={result && !result.ok ? result : null} />

        <Button type="submit" variant="ink" size="xl" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : <UserPlus aria-hidden />}
          {isSubmitting ? "Registering" : "Register and send login details"}
        </Button>
        <p className="text-center text-xs text-slate">A one-time password is generated and emailed. They’ll choose their own at first login.</p>
      </div>
    </form>
  );
}
