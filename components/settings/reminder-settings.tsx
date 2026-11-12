"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  initialEnabled: boolean;
  emailConfigured: boolean;
  email: string;
}

export function ReminderSettings({ initialEnabled, emailConfigured, email }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    setNote(null);
    try {
      const res = await fetch("/api/settings/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailReminders: next }),
      });
      if (!res.ok) throw new Error();
      setEnabled(next);
    } catch {
      setNote({ ok: false, text: "Could not save that change. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setNote(null);
    try {
      const res = await fetch("/api/settings/reminders", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Test email failed.");
      setNote({ ok: true, text: `Test email sent to ${body.to}.` });
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "Test email failed." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Email me reminders</p>
          <p className="text-xs text-gray-500 mt-0.5">
            One email on days something is due: 14, 7, 3, and 1 day before a deadline and on the day,
            when a follow-up date arrives, and before a grant report is due. Sent to {email}.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Email me reminders"
          disabled={saving}
          onClick={toggle}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-brand-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Reminders always appear under Notifications inside GrantFlow, whether or not email is on.
      </p>

      {emailConfigured ? (
        <Button variant="secondary" size="sm" onClick={sendTest} loading={testing}>
          Send me a test email
        </Button>
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
          Email sending is not set up on the server yet, so reminders are in-app only for now.
        </p>
      )}

      {note && (
        <p className={`text-xs ${note.ok ? "text-green-700" : "text-red-600"}`}>{note.text}</p>
      )}
    </div>
  );
}
