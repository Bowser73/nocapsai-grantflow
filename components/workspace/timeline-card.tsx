"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck, ChevronDown, ChevronUp, AlertCircle,
  CheckCircle2, Clock, AlertTriangle, Info, Loader2,
} from "lucide-react";
import {
  GRANT_TYPE_LABELS,
  DECISION_WINDOWS,
  DECISION_STATUS_LABELS,
  DECISION_STATUS_COLORS,
  CONTRACT_STATUS_LABELS,
  FUNDS_STATUS_LABELS,
  getTimelineWarnings,
  formatDecisionWindow,
  type GrantType,
  type DecisionStatus,
  type ContractStatus,
  type FundsReceivedStatus,
  type ApplicationTimelineSnapshot,
} from "@/lib/grant-timeline";

// ── Prop type mirrors the timeline fields from Prisma ────────────────────────

export interface TimelineProps {
  applicationId: string;
  submittedAt:           Date | null;
  deadline:              Date | null;
  grantType:             string | null;
  decisionStatus:        string | null;
  decisionDate:          Date | null;
  awardAmount:           number | null;
  expectedDecisionStart: Date | null;
  expectedDecisionEnd:   Date | null;
  followUpDate:          Date | null;
  contractStatus:        string | null;
  fundsReceivedStatus:   string | null;
  reportDueDate:         Date | null;
  notes:                 string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function toInputDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function WarningPill({
  severity,
  label,
}: {
  severity: "error" | "warning" | "info";
  label: string;
}) {
  const styles = {
    error:   "bg-red-50 text-red-700 border-red-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info:    "bg-blue-50 text-blue-700 border-blue-200",
  };
  const Icon = severity === "error"
    ? AlertCircle
    : severity === "warning"
    ? AlertTriangle
    : Info;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium ${styles[severity]}`}>
      <Icon size={12} className="shrink-0" />
      {label}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TimelineCard(props: TimelineProps) {
  const router = useRouter();
  const [expanded, setExpanded]   = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showOutcome, setShowOutcome] = useState(false);
  const [saving, setSaving]         = useState(false);

  // Submit form state
  const [submitDate, setSubmitDate] = useState(toInputDate(props.submittedAt) || toInputDate(new Date()));
  const [grantType, setGrantType]   = useState<GrantType>((props.grantType as GrantType) || "LOCAL");
  const [customStart, setCustomStart] = useState(toInputDate(props.expectedDecisionStart));
  const [customEnd, setCustomEnd]     = useState(toInputDate(props.expectedDecisionEnd));
  const [submitNotes, setSubmitNotes] = useState("");

  // Outcome form state
  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus>(
    (props.decisionStatus as DecisionStatus) || "SUBMITTED_WAITING"
  );
  const [decisionDate, setDecisionDate]  = useState(toInputDate(props.decisionDate));
  const [awardAmount, setAwardAmount]    = useState(props.awardAmount?.toString() || "");
  const [contractStatus, setContractStatus] = useState<ContractStatus>(
    (props.contractStatus as ContractStatus) || "NOT_STARTED"
  );
  const [fundsStatus, setFundsStatus] = useState<FundsReceivedStatus>(
    (props.fundsReceivedStatus as FundsReceivedStatus) || "NOT_RECEIVED"
  );
  const [reportDue, setReportDue]  = useState(toInputDate(props.reportDueDate));
  const [followUpDate, setFollowUpDate] = useState(toInputDate(props.followUpDate));
  const [outcomeNotes, setOutcomeNotes] = useState(props.notes || "");

  // Compute warnings from current props
  const snapshot: ApplicationTimelineSnapshot = {
    status:                props.decisionStatus ?? "NOT_SUBMITTED",
    decisionStatus:        props.decisionStatus,
    submittedAt:           props.submittedAt,
    deadline:              props.deadline,
    followUpDate:          props.followUpDate,
    expectedDecisionStart: props.expectedDecisionStart,
    expectedDecisionEnd:   props.expectedDecisionEnd,
    reportDueDate:         props.reportDueDate,
  };
  const warnings = getTimelineWarnings(snapshot);

  const isSubmitted = !!props.submittedAt;
  const ds = props.decisionStatus as DecisionStatus | null;
  const dsColors = ds ? DECISION_STATUS_COLORS[ds] : DECISION_STATUS_COLORS["NOT_SUBMITTED"];

  // ── Preview: decision window based on selected grant type ──
  function getPreviewWindow() {
    if (grantType === "CUSTOM") return null;
    const w = DECISION_WINDOWS[grantType];
    return `${w.minDays}–${w.maxDays} days after submission`;
  }

  // ── API: Mark as submitted ───────────────────────────────
  async function handleMarkSubmitted() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        submittedAt: new Date(submitDate).toISOString(),
        grantType,
        notes: submitNotes || undefined,
      };
      if (grantType === "CUSTOM") {
        if (customStart) body.expectedDecisionStart = new Date(customStart).toISOString();
        if (customEnd)   body.expectedDecisionEnd   = new Date(customEnd).toISOString();
      }
      const res = await fetch(`/api/grants/applications/${props.applicationId}/timeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { setShowSubmit(false); router.refresh(); }
    } finally { setSaving(false); }
  }

  // ── API: Update outcome ──────────────────────────────────
  async function handleSaveOutcome() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        decisionStatus,
        decisionDate: decisionDate  ? new Date(decisionDate).toISOString()  : null,
        awardAmount:  awardAmount   ? parseFloat(awardAmount) : null,
        contractStatus,
        fundsReceivedStatus: fundsStatus,
        reportDueDate: reportDue   ? new Date(reportDue).toISOString()   : null,
        followUpDate:  followUpDate ? new Date(followUpDate).toISOString() : null,
        notes:         outcomeNotes || undefined,
      };
      const res = await fetch(`/api/grants/applications/${props.applicationId}/outcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { setShowOutcome(false); router.refresh(); }
    } finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarCheck size={15} className="text-brand-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-900">Timeline Tracker</span>
          {warnings.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {ds && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${dsColors.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dsColors.dot}`} />
              {DECISION_STATUS_LABELS[ds]}
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3">

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="pt-3 space-y-1.5">
              {warnings.map((w) => (
                <WarningPill key={w.type} severity={w.severity} label={w.label} />
              ))}
            </div>
          )}

          {/* Quick info grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 text-xs">
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Submitted</p>
              <p className="text-gray-800 font-medium mt-0.5">{fmt(props.submittedAt)}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Grant type</p>
              <p className="text-gray-800 font-medium mt-0.5">
                {props.grantType ? GRANT_TYPE_LABELS[props.grantType as GrantType] ?? props.grantType : "—"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Decision window</p>
              <p className="text-gray-800 font-medium mt-0.5">
                {formatDecisionWindow(props.expectedDecisionStart, props.expectedDecisionEnd)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Follow-up date</p>
              <p className="text-gray-800 font-medium mt-0.5">{fmt(props.followUpDate)}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Decision date</p>
              <p className="text-gray-800 font-medium mt-0.5">{fmt(props.decisionDate)}</p>
            </div>
            {props.awardAmount != null && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Award amount</p>
                <p className="text-green-700 font-semibold mt-0.5">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(props.awardAmount)}
                </p>
              </div>
            )}
            {props.contractStatus && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Contract</p>
                <p className="text-gray-800 font-medium mt-0.5">
                  {CONTRACT_STATUS_LABELS[props.contractStatus as ContractStatus] ?? props.contractStatus}
                </p>
              </div>
            )}
            {props.fundsReceivedStatus && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Funds received</p>
                <p className="text-gray-800 font-medium mt-0.5">
                  {FUNDS_STATUS_LABELS[props.fundsReceivedStatus as FundsReceivedStatus] ?? props.fundsReceivedStatus}
                </p>
              </div>
            )}
            {props.reportDueDate && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide text-[10px] font-semibold">Report due</p>
                <p className="text-gray-800 font-medium mt-0.5">{fmt(props.reportDueDate)}</p>
              </div>
            )}
          </div>

          {/* Income reminder */}
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-snug">
              Do not count grant funding as income until an award notice and signed agreement are received.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {!isSubmitted ? (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg cursor-not-allowed"
              >
                <CheckCircle2 size={13} />
                Use “Ready to Submit” menu to mark submitted
              </button>
            ) : (
              <button
                onClick={() => setShowSubmit((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50 transition-colors"
              >
                <Clock size={12} />
                Edit submission
              </button>
            )}
            {isSubmitted && (
              <button
                onClick={() => setShowOutcome((v) => !v)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Update outcome
              </button>
            )}
          </div>

          {/* ── Mark as Submitted panel ── */}
          {showSubmit && isSubmitted && (
            <div className="border border-brand-200 rounded-lg p-3 bg-brand-50/40 space-y-3">
              <p className="text-xs font-semibold text-brand-800">Mark as Submitted</p>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Submitted date</label>
                <input
                  type="date"
                  value={submitDate}
                  onChange={(e) => setSubmitDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Grant type</label>
                <select
                  value={grantType}
                  onChange={(e) => setGrantType(e.target.value as GrantType)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {(Object.entries(GRANT_TYPE_LABELS) as [GrantType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {grantType !== "CUSTOM" && (
                  <p className="text-xs text-brand-600 mt-1">
                    Decision window: {getPreviewWindow()}
                  </p>
                )}
              </div>

              {grantType === "CUSTOM" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Window start</label>
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Window end</label>
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-600 mb-1">Notes (optional)</label>
                <textarea
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Submitted via Submittable. Confirmation #1234"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleMarkSubmitted}
                  disabled={saving || !submitDate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Save
                </button>
                <button
                  onClick={() => setShowSubmit(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Update Outcome panel ── */}
          {showOutcome && (
            <div className="border border-gray-200 rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-gray-800">Update Outcome</p>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Decision status</label>
                <select
                  value={decisionStatus}
                  onChange={(e) => setDecisionStatus(e.target.value as DecisionStatus)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {(Object.entries(DECISION_STATUS_LABELS) as [DecisionStatus, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Decision date</label>
                  <input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Follow-up date</label>
                  <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>

              {(decisionStatus === "AWARDED") && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Award amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={awardAmount}
                    onChange={(e) => setAwardAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Contract status</label>
                  <select
                    value={contractStatus}
                    onChange={(e) => setContractStatus(e.target.value as ContractStatus)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    {(Object.entries(CONTRACT_STATUS_LABELS) as [ContractStatus, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Funds received</label>
                  <select
                    value={fundsStatus}
                    onChange={(e) => setFundsStatus(e.target.value as FundsReceivedStatus)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    {(Object.entries(FUNDS_STATUS_LABELS) as [FundsReceivedStatus, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Reporting deadline</label>
                <input type="date" value={reportDue} onChange={(e) => setReportDue(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Notes</label>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveOutcome}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                  Save outcome
                </button>
                <button
                  onClick={() => setShowOutcome(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
