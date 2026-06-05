"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GRANT_SECTION_LABELS } from "@/types";
import { runComplianceCheck } from "@/lib/agents/grant-context";
import type { ComplianceFlag } from "@/types";
import { Sparkles, Edit2, X, Save, CheckCircle, RotateCcw, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionData {
  id: string;
  sectionType: string;
  content: string | null;
  wordCount: number | null;
  wordLimit: number | null;
  isApproved: boolean;
}

interface SectionCardProps {
  section: SectionData;
  applicationId: string;
  grantTitle?: string;
  funder?: string;
  orgName?: string;
}

const FLAG_STYLES: Record<ComplianceFlag["severity"], string> = {
  error:   "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info:    "bg-blue-50 border-blue-200 text-blue-700",
};

const FLAG_ICONS: Record<ComplianceFlag["severity"], typeof AlertCircle> = {
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

function CompliancePanel({ flags }: { flags: ComplianceFlag[] }) {
  const [open, setOpen] = useState(true);
  if (flags.length === 0) return null;

  const errors   = flags.filter((f) => f.severity === "error");
  const warnings = flags.filter((f) => f.severity === "warning");
  const infos    = flags.filter((f) => f.severity === "info");

  const headerColor =
    errors.length > 0   ? "bg-red-50 border-red-200 text-red-800" :
    warnings.length > 0 ? "bg-amber-50 border-amber-200 text-amber-800" :
    "bg-blue-50 border-blue-200 text-blue-700";

  const headerIcon =
    errors.length > 0   ? <AlertCircle size={13} className="text-red-600 shrink-0" /> :
    warnings.length > 0 ? <AlertTriangle size={13} className="text-amber-600 shrink-0" /> :
    <Info size={13} className="text-blue-500 shrink-0" />;

  return (
    <div className={cn("mt-3 border rounded-lg overflow-hidden text-xs", headerColor)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn("w-full flex items-center justify-between gap-2 px-3 py-2 font-semibold text-left", headerColor)}
      >
        <span className="flex items-center gap-1.5">
          {headerIcon}
          Draft Review — {flags.length} item{flags.length !== 1 ? "s" : ""} to check before approving
          {errors.length > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {errors.length} error{errors.length !== 1 ? "s" : ""}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="border-t border-current/20 divide-y divide-current/10">
          {flags.map((flag, i) => {
            const Icon = FLAG_ICONS[flag.severity];
            return (
              <div key={i} className={cn("flex items-start gap-2 px-3 py-2", FLAG_STYLES[flag.severity])}>
                <Icon size={12} className="shrink-0 mt-0.5" />
                <span>{flag.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SectionCard({ section, applicationId, grantTitle = "", funder = "", orgName = "" }: SectionCardProps) {
  const router = useRouter();
  const [localContent, setLocalContent] = useState(section.content ?? "");
  const [localApproved, setLocalApproved] = useState(section.isApproved);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(section.content ?? "");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = localContent
    ? localContent.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const label =
    GRANT_SECTION_LABELS[section.sectionType as keyof typeof GRANT_SECTION_LABELS] ??
    section.sectionType;

  // Run compliance check on current content whenever it changes
  const complianceFlags = useMemo(() => {
    if (!localContent || !orgName) return [];
    return runComplianceCheck(localContent, orgName, grantTitle, funder);
  }, [localContent, orgName, grantTitle, funder]);

  async function handleRegenerate() {
    setIsRegenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/grants/applications/${applicationId}/sections/${section.id}/regenerate`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Regeneration failed");
      }
      const data = await res.json();
      setLocalContent(data.content);
      setEditContent(data.content);
      setLocalApproved(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleApprove() {
    setIsApproving(true);
    setError(null);
    const newApproved = !localApproved;
    try {
      const res = await fetch(
        `/api/grants/applications/${applicationId}/sections/${section.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved: newApproved }),
        }
      );
      if (!res.ok) throw new Error("Failed to update approval");
      setLocalApproved(newApproved);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/grants/applications/${applicationId}/sections/${section.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent }),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      setLocalContent(editContent);
      setLocalApproved(false);
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditContent(localContent);
    setIsEditing(false);
    setError(null);
  }

  const hasErrors = complianceFlags.some((f) => f.severity === "error");

  return (
    <Card className={cn(localApproved && "border-green-200", hasErrors && !localApproved && "border-red-200")}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
          {localApproved && (
            <Badge variant="success" size="sm">
              <CheckCircle size={10} className="mr-1" />
              Approved
            </Badge>
          )}
          {!localApproved && complianceFlags.length > 0 && (
            <Badge variant={hasErrors ? "danger" : "warning"} size="sm">
              {complianceFlags.length} review item{complianceFlags.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-gray-400 mr-1">
            {wordCount} words
            {section.wordLimit ? ` / ${section.wordLimit}` : ""}
          </span>

          {!isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditContent(localContent); setIsEditing(true); }}
                icon={<Edit2 size={13} />}
                disabled={isRegenerating || isApproving}
              >
                Edit
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                loading={isRegenerating}
                icon={<Sparkles size={13} className="text-brand-500" />}
                disabled={isApproving}
              >
                {isRegenerating ? "Writing..." : "Regenerate"}
              </Button>

              <Button
                variant={localApproved ? "secondary" : "outline"}
                size="sm"
                onClick={handleApprove}
                loading={isApproving}
                disabled={isRegenerating || !localContent || (hasErrors && !localApproved)}
                title={hasErrors && !localApproved ? "Fix review errors before approving" : undefined}
              >
                {localApproved ? "Unapprove" : "Approve"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit} icon={<X size={13} />} disabled={isSaving}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} loading={isSaving} icon={<Save size={13} />}>
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-1.5 mb-3">
          {error}
        </p>
      )}

      {/* Content */}
      {isEditing ? (
        <>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[220px] text-sm text-gray-700 bg-white rounded-md p-3 border border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y leading-relaxed font-sans"
            autoFocus
          />
          {localApproved && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <RotateCcw size={11} />
              Saving will reset the Approved status for this section.
            </p>
          )}
        </>
      ) : (
        <div
          className={cn(
            "prose-grant bg-gray-50 rounded-md p-3",
            localApproved && "bg-green-50/40 border border-green-100"
          )}
        >
          {localContent || (
            <span className="text-gray-400 italic text-sm">
              No content yet — click{" "}
              <strong className="text-brand-600">Regenerate</strong> to generate
              this section with AI.
            </span>
          )}
        </div>
      )}

      {/* Compliance panel — only when not editing and content exists */}
      {!isEditing && localContent && (
        <CompliancePanel flags={complianceFlags} />
      )}
    </Card>
  );
}