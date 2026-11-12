/**
 * GrantFlow AI — Reminder digest email
 * One email per person per day, listing everything that is due for them.
 */
import { appUrl, escapeHtml, type EmailMessage } from "@/lib/email/send";
import type { DueReminder } from "@/lib/reminders/rules";

export interface DigestItem extends DueReminder {
  orgName: string;
}

export function buildDigestEmail(to: string, name: string | null, items: DigestItem[]): EmailMessage {
  const sorted = [...items].sort((a, b) => a.daysLeft - b.daysLeft);
  const first = sorted[0];
  const subject =
    sorted.length === 1
      ? first.title
      : `${sorted.length} grant reminders — soonest: ${first.title}`;

  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi,";
  const settingsUrl = appUrl("/settings");

  const text = [
    greeting,
    "",
    sorted.length === 1 ? "A reminder from GrantFlow:" : "Your reminders from GrantFlow:",
    "",
    ...sorted.flatMap((i) => [
      `• ${i.title}`,
      `  ${i.message}`,
      `  ${i.orgName} — ${appUrl(i.href)}`,
      "",
    ]),
    "GrantFlow does not submit applications for you. Submit through the funder's own portal, then mark the application as submitted in GrantFlow.",
    "",
    `Turn these emails off any time: ${settingsUrl}`,
  ].join("\n");

  const rows = sorted
    .map(
      (i) => `
      <tr><td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:15px;font-weight:600;color:#111827;">${escapeHtml(i.title)}</div>
        <div style="font-size:14px;color:#4b5563;margin-top:4px;">${escapeHtml(i.message)}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:6px;">${escapeHtml(i.orgName)} ·
          <a href="${escapeHtml(appUrl(i.href))}" style="color:#0f766e;font-weight:600;">Open application</a></div>
      </td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;padding:28px;">
      <tr><td style="font-size:13px;font-weight:700;letter-spacing:1px;color:#0f766e;text-transform:uppercase;">GrantFlow reminders</td></tr>
      <tr><td style="font-size:15px;color:#111827;padding:14px 0 4px;">${escapeHtml(greeting)}</td></tr>
      ${rows}
      <tr><td style="font-size:12px;color:#6b7280;padding-top:18px;line-height:1.5;">
        GrantFlow does not submit applications for you. Submit through the funder's own portal, then mark the application as submitted in GrantFlow.<br><br>
        <a href="${escapeHtml(settingsUrl)}" style="color:#6b7280;">Turn these emails off in Settings</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  return { to, subject, html, text };
}
