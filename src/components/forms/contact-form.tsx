"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { sendContactMessage, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormStatus } from "@/components/forms/form-status";
import { NativeSelect, inputClass } from "@/components/forms/fields";
import { contactSchema, contactTopics, type ContactValues } from "@/lib/schemas";

export function ContactForm({ defaultTopic = "open-account" }: { defaultTopic?: ContactValues["topic"] }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", topic: defaultTopic, message: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    const res = await sendContactMessage(values);
    setResult(res);
    if (res.ok) reset();
  });

  const described = (name: keyof ContactValues, hint?: string) =>
    [errors[name] ? `contact-${name}-error` : null, hint].filter(Boolean).join(" ") || undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FieldGroup className="gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="contact-name" className="text-ink">Full name</FieldLabel>
            <Input id="contact-name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={described("name")} className={inputClass} {...register("name")} />
            <FieldError id="contact-name-error" errors={[errors.name]} />
          </Field>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="contact-email" className="text-ink">Email address</FieldLabel>
            <Input id="contact-email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={described("email")} className={inputClass} {...register("email")} />
            <FieldError id="contact-email-error" errors={[errors.email]} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="contact-phone" className="text-ink">
              Phone number <span className="font-normal text-slate">(optional)</span>
            </FieldLabel>
            <Input id="contact-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={described("phone")} className={inputClass} {...register("phone")} />
            <FieldError id="contact-phone-error" errors={[errors.phone]} />
          </Field>
          <Field data-invalid={!!errors.topic}>
            <FieldLabel htmlFor="contact-topic" className="text-ink">What’s it about?</FieldLabel>
            <NativeSelect id="contact-topic" aria-invalid={!!errors.topic} aria-describedby={described("topic")} {...register("topic")}>
              {contactTopics.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
            <FieldError id="contact-topic-error" errors={[errors.topic]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.message}>
          <FieldLabel htmlFor="contact-message" className="text-ink">Message</FieldLabel>
          <Textarea
            id="contact-message"
            rows={5}
            aria-invalid={!!errors.message}
            aria-describedby={described("message", "contact-message-hint")}
            className="min-h-32 rounded-lg bg-surface px-3.5 py-3 text-base md:text-[0.95rem]"
            {...register("message")}
          />
          <FieldDescription id="contact-message-hint">
            Please don’t include account numbers, passwords or card details.
          </FieldDescription>
          <FieldError id="contact-message-error" errors={[errors.message]} />
        </Field>
      </FieldGroup>

      <FormStatus result={result} />

      <Button type="submit" variant="ink" size="xl" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        {isSubmitting ? "Sending" : "Send message"}
      </Button>
    </form>
  );
}
