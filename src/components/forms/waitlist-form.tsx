"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellRing, Loader2 } from "lucide-react";
import { joinLoanWaitlist, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormStatus } from "@/components/forms/form-status";
import { NativeSelect, inputClass } from "@/components/forms/fields";
import { loanProducts } from "@/lib/rates";
import { waitlistSchema, type WaitlistValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** "Tell me when loans launch" sign-up. `tone="light"` is for dark backgrounds. */
export function WaitlistForm({ tone = "dark", idPrefix = "waitlist" }: { tone?: "dark" | "light"; idPrefix?: string }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: "", product: "personal" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    const res = await joinLoanWaitlist(values);
    setResult(res);
    if (res.ok) reset();
  });

  const light = tone === "light";
  const labelClass = light ? "text-white/85" : "text-ink";
  const errorClass = light ? "text-red-300" : undefined;
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <Field data-invalid={!!errors.email} className={cn(light && "data-[invalid=true]:text-red-300")}>
          <FieldLabel htmlFor={id("email")} className={labelClass}>Email address</FieldLabel>
          <Input
            id={id("email")}
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? id("email-error") : undefined}
            className={cn(inputClass, "text-ink")}
            {...register("email")}
          />
          <FieldError id={id("email-error")} errors={[errors.email]} className={errorClass} />
        </Field>
        <Field data-invalid={!!errors.product} className={cn(light && "data-[invalid=true]:text-red-300")}>
          <FieldLabel htmlFor={id("product")} className={labelClass}>Loan type</FieldLabel>
          <NativeSelect
            id={id("product")}
            aria-invalid={!!errors.product}
            aria-describedby={errors.product ? id("product-error") : undefined}
            {...register("product")}
          >
            {loanProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError id={id("product-error")} errors={[errors.product]} className={errorClass} />
        </Field>
      </div>

      <FormStatus result={result} tone={tone} />

      <Button type="submit" variant="amber" size="xl" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : <BellRing aria-hidden />}
        {isSubmitting ? "Joining" : "Notify me at launch"}
      </Button>
    </form>
  );
}
