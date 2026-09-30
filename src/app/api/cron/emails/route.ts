import { timingSafeEqual } from "node:crypto";
import { deliverPendingEmails } from "@/lib/email/outbox";

/**
 * Sends notification emails the app didn't send itself: those made by the
 * scheduled database jobs (interest, autopay). Called every few minutes by
 * pg_cron (supabase/setup/04_email_job.sql) with `Authorization: Bearer CRON_SECRET`.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Not allowed" }, { status: 401 });
  }
  return Response.json(await deliverPendingEmails());
}
