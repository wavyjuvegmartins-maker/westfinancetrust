"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { changePassword, type ActionResult } from "@/app/actions";
import { FormStatus } from "@/components/forms/form-status";
import { inputClass } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const rules = [
  { label: "At least 12 characters", test: (p: string) => p.length >= 12 },
  { label: "A letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "A number", test: (p: string) => /[0-9]/.test(p) },
];

export function ChangePasswordForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const password = useWatch({ control, name: "password" }) ?? "";

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    const res = await changePassword(values);
    setResult(res);
    if (res.ok) router.replace(res.redirectTo ?? "/dashboard");
  });
  const busy = isSubmitting || (isSubmitSuccessful && result?.ok);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="new-password" className="text-ink">New password</FieldLabel>
          <div className="relative">
            <Input
              id="new-password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby="password-rules"
              className={`${inputClass} pr-12`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-pressed={show}
              className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate hover:text-ink"
            >
              {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              <span className="sr-only">{show ? "Hide passwords" : "Show passwords"}</span>
            </button>
          </div>
          <ul id="password-rules" className="mt-1 grid gap-1 text-sm">
            {rules.map((r) => {
              const met = r.test(password);
              return (
                <li key={r.label} className={cn("flex items-center gap-2", met ? "text-positive" : "text-slate")}>
                  <span className={cn("flex size-4 items-center justify-center rounded-full", met ? "bg-positive/15" : "bg-line")}>
                    {met && <Check className="size-3" strokeWidth={3} aria-hidden />}
                  </span>
                  {r.label}
                </li>
              );
            })}
          </ul>
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={!!errors.confirm}>
          <FieldLabel htmlFor="confirm-password" className="text-ink">Type it again</FieldLabel>
          <Input
            id="confirm-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            className={inputClass}
            {...register("confirm")}
          />
          <FieldError errors={[errors.confirm]} />
        </Field>
      </FieldGroup>

      <FormStatus result={result} />

      <Button type="submit" variant="ink" size="xl" className="w-full" disabled={!!busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <LockKeyhole aria-hidden />}
        {busy ? "Saving" : "Save new password"}
      </Button>
    </form>
  );
}
