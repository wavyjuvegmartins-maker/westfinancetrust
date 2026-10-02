import "server-only";
import { button, details, escape, layout, p, siteUrl, small, textLayout } from "@/lib/email/layout";
import { loanProducts } from "@/lib/rates";
import { site } from "@/lib/site";

export type Rendered = { subject: string; text: string; html: string };

const loanName = (id: string) => loanProducts.find((l) => l.id === id)?.name.toLowerCase() ?? "loan";

/* ---------------------------------------------------------------- logins */

export function credentialsEmail({ firstName, userId, password, kind }: { firstName: string; userId: string; password: string; kind: "welcome" | "reset" }): Rendered {
  const loginUrl = siteUrl("/login");
  const intro = kind === "welcome" ? "Your accounts are open and online banking is ready for you." : "We’ve reset your online banking password, as you asked.";
  const after = "You’ll choose your own password straight away, and this one stops working.";
  const footer = "If you didn’t expect this email, tell us straight away.";
  return {
    subject: kind === "welcome" ? `Your ${site.name} online banking login` : `Your new ${site.name} password`,
    text: textLayout([`Hello ${firstName},`, intro, `User ID: ${userId}\nOne-time password: ${password}`, `Log in at ${loginUrl}. ${after}`], footer),
    html: layout({
      preheader: intro,
      body:
        p(`Hello ${firstName},`) +
        p(intro, "margin-bottom:24px") +
        details([
          { label: "User ID", value: userId },
          { label: "One-time password", value: password, mono: true },
        ]) +
        button("Log in to online banking", loginUrl) +
        small(after),
      footer,
    }),
  };
}

/* --------------------------------------------------------- notifications */

export type NoticeTopic = "security" | "activity" | "low_balance" | "login" | "message";

const why: Record<NoticeTopic, string> = {
  security: "We always email you about security changes to your account.",
  activity: "You get these because account activity emails are on. Turn them off in online banking under Settings.",
  low_balance: "You get these because low balance alerts are on. Turn them off in online banking under Settings.",
  login: "You get these because new sign-in alerts are on. Turn them off in online banking under Settings.",
  message: "We always tell you when we've sent you a message. For your security, messages can only be read in online banking.",
};

/** Any in-app notification, as an email. The title and body come from the notification itself. */
export function noticeEmail({ firstName, title, body, topic }: { firstName: string; title: string; body: string; topic: NoticeTopic }): Rendered {
  const url = siteUrl(topic === "message" ? "/dashboard/messages" : "/dashboard");
  const warn = topic === "security" || topic === "login";
  const unexpected = `Not you? Call us straight away on ${site.phone}.`;
  return {
    subject: title,
    text: textLayout([`Hello ${firstName},`, `${title}\n${body}`, ...(warn ? [unexpected] : []), `See it in online banking: ${url}`], why[topic]),
    html: layout({
      preheader: body,
      body:
        p(`Hello ${firstName},`) +
        `<p style="margin:0 0 4px;font-size:18px;font-weight:bold">${escape(title)}</p>` +
        p(body, "margin-bottom:24px") +
        (warn ? p(unexpected, "font-weight:bold") : "") +
        button("Open online banking", url),
      footer: why[topic],
    }),
  };
}

/* --------------------------------------------------------- contact form */

/**
 * The receipt for someone who used the contact form. Anyone can type any
 * address into that form, so this never repeats what they wrote: otherwise it
 * could be used to send our name on someone else's words.
 */
export function contactReceiptEmail({ topicLabel }: { topicLabel: string }): Rendered {
  const line = `Thanks for getting in touch about “${topicLabel}”. A member of our team will reply within one business day.`;
  const urgent = `If it’s urgent, or about a lost or stolen card, call ${site.phone} now.`;
  const footer = "You get this because this address was entered in the contact form on our website. If that wasn’t you, you can ignore it.";
  return {
    subject: `We got your message – ${site.name}`,
    text: textLayout(["Hello,", line, urgent], footer),
    html: layout({ preheader: line, body: p("Hello,") + p(line) + p(urgent), footer }),
  };
}

export function contactStaffEmail(m: { name: string; email: string; phone?: string | null; topicLabel: string; message: string }): Rendered {
  const url = siteUrl("/admin/messages");
  const from = `${m.name} <${m.email}>${m.phone ? `, ${m.phone}` : ""}`;
  return {
    subject: `Website message: ${m.topicLabel} from ${m.name}`,
    text: [`From: ${from}`, `Topic: ${m.topicLabel}`, "", m.message, "", `Reply to this email to answer them, then mark it handled: ${url}`].join("\n"),
    html: layout({
      preheader: m.message.slice(0, 120),
      body:
        details([
          { label: "From", value: from },
          { label: "Topic", value: m.topicLabel },
        ]) +
        `<p style="margin:0 0 24px;white-space:pre-line">${escape(m.message)}</p>` +
        small("Reply to this email to answer them, then mark it handled.") +
        button("Open messages", url),
    }),
  };
}

/* ------------------------------------------------------------ waitlist */

export function waitlistJoinedEmail({ product }: { product: string }): Rendered {
  const name = loanName(product);
  const line = `You’re on the waitlist for our ${name}. We’ll email you once, as soon as it opens.`;
  const footer = "You get this because this address joined a loan waitlist on our website. If that wasn’t you, you can ignore it.";
  return {
    subject: `You’re on the ${name} waitlist`,
    text: textLayout(["Hello,", line, `Until then, see our current rates at ${siteUrl("/loans")}.`], footer),
    html: layout({ preheader: line, body: p("Hello,") + p(line) + button("See loan rates", siteUrl("/loans")), footer }),
  };
}

/** Sent once per waitlist entry, when staff announce that a loan is open. Applying is done in person or by phone. */
export function loansOpenEmail({ product }: { product: string }): Rendered {
  const name = loanName(product);
  const line = `Our ${name} is now open, and you asked us to tell you.`;
  const how = `To apply, call ${site.phone} or visit us at ${site.branch.lines.join(", ")}. We’ll go through it with you and give you a decision quickly.`;
  const footer = "You get this because you joined our loan waitlist. This is the only email about it.";
  return {
    subject: `Our ${name} is open`,
    text: textLayout(["Hello,", line, how, `Rates and details: ${siteUrl("/loans")}`], footer),
    html: layout({ preheader: line, body: p("Hello,") + p(line) + p(how) + button("See rates and details", siteUrl("/loans")), footer }),
  };
}
