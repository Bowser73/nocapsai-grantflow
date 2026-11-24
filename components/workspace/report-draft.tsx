"use client";
import { useState } from "react";
export function ReportDraft({ sectionId }: { sectionId: string }) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState("offensive"),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/ai-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, reason, note }),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error || "Could not send report");
      setMessage("Report received by NoCapsAI. Thank you.");
      setOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Report failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mb-3 text-xs">
      <button className="underline" onClick={() => setOpen(!open)}>
        Report an AI draft
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded border p-3">
          <label className="block">
            Reason{" "}
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="border p-1"
            >
              <option value="offensive">Offensive content</option>
              <option value="unsafe">Unsafe content</option>
              <option value="inaccurate">Inaccurate content</option>
              <option value="other">Other concern</option>
            </select>
          </label>
          <label className="block">
            Note (optional)
            <textarea
              className="block w-full border p-2"
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <p>
            Submitting sends the saved draft and your note to NoCapsAI for
            review. Do not include passwords or payment details.
          </p>
          <button
            className="rounded border px-3 py-2"
            disabled={busy}
            onClick={submit}
          >
            {busy ? "Sending…" : "Submit report"}
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
