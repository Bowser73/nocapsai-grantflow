"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Download,
  ExternalLink,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  X,
} from "lucide-react";

interface SubmissionActionsProps {
  applicationId: string;
  applicationStatus: string;
  officialApplicationUrl: string | null;
  submissionInstructions: string;
  defaultSubmittedBy: string;
}

function toDateTimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function SubmissionActions({
  applicationId,
  applicationStatus,
  officialApplicationUrl,
  submissionInstructions,
  defaultSubmittedBy,
}: SubmissionActionsProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [submittedBy, setSubmittedBy] = useState(defaultSubmittedBy);
  const [submittedAt, setSubmittedAt] = useState(toDateTimeLocalValue(new Date()));

  const isOfficialLinkMissing = !officialApplicationUrl;

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/grants/applications/${applicationId}/export`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const fileNameMatch = disposition.match(/filename=\"?([^\"]+)\"?/);
      const fileName = fileNameMatch?.[1] ?? "grant-application.docx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  function handleOpenOfficialApplication() {
    if (!officialApplicationUrl) return;
    window.open(officialApplicationUrl, "_blank", "noopener,noreferrer");
  }

  async function handleSubmitConfirmation() {
    if (!confirmationNumber.trim() || !submittedBy.trim() || !submittedAt) {
      alert("Confirmation number/note, submitted by, and submission date/time are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/grants/applications/${applicationId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationNumber: confirmationNumber.trim(),
          submittedBy: submittedBy.trim(),
          submittedAt: new Date(submittedAt).toISOString(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to mark as submitted");
      }

      setShowSubmitModal(false);
      setShowMenu(false);
      router.refresh();
    } catch (err) {
      console.error("Submit confirmation error:", err);
      alert(err instanceof Error ? err.message : "Failed to mark as submitted.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleExport}
        loading={isExporting}
        icon={<Download size={14} />}
      >
        {isExporting ? "Exporting..." : "Export .docx"}
      </Button>

      {officialApplicationUrl ? (
        <a
          href={officialApplicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm h-8 px-3 text-sm gap-1.5"
        >
          <ExternalLink size={14} />
          Open Official Application
        </a>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          disabled
          icon={<ExternalLink size={14} />}
          title="Official submission link missing"
        >
          Official submission link missing
        </Button>
      )}

      <Button size="sm" variant="ghost" icon={<ShieldCheck size={14} />} disabled>
        Compliance
      </Button>

      <div ref={menuRef} className="relative">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowMenu((v) => !v)}
          iconRight={<ChevronDown size={14} />}
        >
          Ready to Submit
        </Button>

        {showMenu && (
          <div className="absolute right-0 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg z-20 p-1.5">
            <div className="px-2 py-1.5 text-[11px] text-gray-500 leading-relaxed">
              “Ready to Submit” means your package is ready to export and submit through the official portal.
            </div>
            <button
              onClick={handleExport}
              className="w-full text-left px-2.5 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <Download size={13} />
              Export .docx
            </button>
            <button
              disabled
              className="w-full text-left px-2.5 py-2 text-sm text-gray-400 rounded-md flex items-center gap-2 cursor-not-allowed"
            >
              <ShieldCheck size={13} />
              Run Compliance Check
            </button>
            <button
              onClick={handleOpenOfficialApplication}
              disabled={isOfficialLinkMissing}
              className={`w-full text-left px-2.5 py-2 text-sm rounded-md flex items-center gap-2 ${
                isOfficialLinkMissing
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              title={isOfficialLinkMissing ? "Official submission link missing" : undefined}
            >
              <ExternalLink size={13} />
              {isOfficialLinkMissing ? "Official submission link missing" : "Open Official Application"}
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setShowSubmitModal(true);
              }}
              className="w-full text-left px-2.5 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <CheckCircle2 size={13} />
              {applicationStatus === "SUBMITTED" ? "Update Submitted Details" : "Mark as Submitted"}
            </button>
          </div>
        )}
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Mark as Submitted</h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                {submissionInstructions}
              </p>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Confirmation number or note</label>
                <input
                  type="text"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  placeholder="e.g. Grants.gov tracking number"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Submitted by</label>
                <input
                  type="text"
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Submission date/time</label>
                <input
                  type="datetime-local"
                  value={submittedAt}
                  onChange={(e) => setSubmittedAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSubmitModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitConfirmation}
                disabled={!confirmationNumber.trim() || !submittedBy.trim() || !submittedAt}
                icon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              >
                {isSubmitting ? "Saving..." : "Save Submitted Status"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
