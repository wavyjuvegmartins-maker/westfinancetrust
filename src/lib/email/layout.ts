import "server-only";
import { site } from "@/lib/site";

// Email HTML is table-based with inline styles: most mail apps ignore <style> and modern CSS.

export const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const siteUrl = (path = "") => `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${path}`;

const muted = "color:#56627a;font-size:14px";

/** A paragraph of plain text (escaped). */
export const p = (text: string, style = "") => `<p style="margin:0 0 16px;${style}">${escape(text)}</p>`;
export const small = (text: string) => p(text, muted);

export const button = (label: string, href: string) =>
  `<p style="margin:8px 0 24px"><a href="${escape(href)}" style="display:inline-block;background:#0f1b33;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${escape(label)}</a></p>`;

/** Labelled values in a shaded box, e.g. a user ID and password. */
export const details = (rows: { label: string; value: string; mono?: boolean }[]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f8;border-radius:14px;padding:16px 20px;margin-bottom:24px">${rows
    .map(
      (r, i) =>
        `<tr><td style="color:#56627a;font-size:13px">${escape(r.label)}</td></tr><tr><td style="font-size:17px;font-weight:bold;${r.mono ? "font-family:Consolas,Menlo,monospace;letter-spacing:1px;" : ""}${i < rows.length - 1 ? "padding-bottom:12px" : ""}">${escape(r.value)}</td></tr>`,
    )
    .join("")}</table>`;

/**
 * The frame every email shares. `preheader` is the preview line mail apps show
 * next to the subject; `footer` explains why the customer got this email.
 */
export function layout({ preheader, body, footer }: { preheader: string; body: string; footer?: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f1f3f8;font-family:Arial,Helvetica,sans-serif;color:#0f1b33">
  <div style="display:none;max-height:0;overflow:hidden">${escape(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;padding:32px">
      <tr><td style="font-size:18px;font-weight:bold;padding-bottom:24px">${escape(site.name)}</td></tr>
      <tr><td style="font-size:16px;line-height:1.6">${body}</td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px"><tr><td style="padding:20px 8px 0;${muted};font-size:12px;line-height:1.5">
      ${footer ? `<p style="margin:0 0 8px">${escape(footer)}</p>` : ""}
      <p style="margin:0">We will never ask for your password by phone, email or text. Questions? Call ${escape(site.phone)}.</p>
    </td></tr></table>
  </td></tr></table>
</body></html>`;
}

/** The plain-text version: paragraphs separated by blank lines, then the same footer. */
export function textLayout(paragraphs: string[], footer?: string) {
  return [
    ...paragraphs,
    ...(footer ? [footer] : []),
    `We will never ask for your password by phone, email or text. Questions? Call ${site.phone}.`,
    site.name,
  ].join("\n\n");
}
