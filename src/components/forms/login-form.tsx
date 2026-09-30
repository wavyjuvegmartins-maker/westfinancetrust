"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { signIn, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormStatus } from "@/components/forms/form-status";
import { inputClass } from "@/components/forms/fields";
import { loginSchema, type LoginValues } from "@/lib/schemas";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userId: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    const res = await signIn(values);
    setResult(res);
    if (res.ok) router.replace(res.redirectTo ?? "/dashboard");
  });

  const busy = isSubmitting || (isSubmitSuccessful && result?.ok);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.userId}>
          <FieldLabel htmlFor="userId" className="text-ink">User ID</FieldLabel>
          <Input
            id="userId"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.userId}
            aria-describedby={errors.userId ? "userId-error" : undefined}
            className={inputClass}
            {...register("userId")}
          />
          <FieldError id="userId-error" errors={[errors.userId]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password" className="text-ink">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={`${inputClass} pr-12`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate hover:text-ink"
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
            </button>
          </div>
          <FieldError id="password-error" errors={[errors.password]} />
        </Field>
      </FieldGroup>

      <FormStatus result={result} />

      <Button type="submit" variant="ink" size="xl" className="w-full" disabled={!!busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <LockKeyhole aria-hidden />}
        {busy ? "Logging in" : "Log in"}
      </Button>
    </form>
  );
}
