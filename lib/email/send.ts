/**
 * GrantFlow AI — Email sending (Resend)
 *
 * Uses Resend's HTTP API directly, so no extra package is needed.
 * Requires RESEND_API_KEY and EMAIL_FROM. When either is missing, sending is
 * skipped and reported as "not_configured" — callers decide what to do.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "not_configured" | "failed"; detail?: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "not_configured" };

  try {
    const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      console.error("[email] Resend rejected the message:", res.status, detail);
      return { sent: false, reason: "failed", detail: `HTTP ${res.status}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: data.id ?? null };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[email] send failed:", detail);
    return { sent: false, reason: "failed", detail };
  }
}

export function appUrl(path = ""): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return base.replace(/\/+$/, "") + path;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
