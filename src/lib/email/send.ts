import "server-only";
import { site } from "@/lib/site";

export type Email = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  /** Resend refuses a second email with the same key for 24 hours, so a retry can't send twice. */
  idempotencyKey?: string;
};

export type SendResult = { sent: boolean; reason?: string };

export const emailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

/**
 * Sends one email through Resend. Never throws: callers decide what a failure
 * means. Until RESEND_API_KEY is set, development prints the email to the
 * server console instead (production prints nothing, as emails can hold passwords).
 */
export async function sendEmail(email: Email): Promise<SendResult> {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.info(`\n[email not sent: RESEND_API_KEY is empty]\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    }
    return { sent: false, reason: "Email isn’t set up yet (RESEND_API_KEY is empty)." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        // Replies reach a real inbox: mail filters trust senders that can be answered.
        reply_to: email.replyTo ?? (process.env.STAFF_EMAIL || site.email),
      }),
    });
    if (!res.ok) return { sent: false, reason: `The email service refused it (${res.status}).` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "The email service couldn’t be reached." };
  }
}
