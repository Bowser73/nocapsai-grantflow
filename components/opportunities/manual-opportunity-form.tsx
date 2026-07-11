"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  Info,
} from "lucide-react";
import {
  FOR_PROFIT_APPLICANT_WARNING,
  GRANT_ELIGIBILITY_LABELS,
  GRANT_STAGE_LABELS,
  shouldWarnForProfitApplicant,
} from "@/lib/grant-workflows";
import type { GrantEligibilityTag, GrantWritingStage } from "@prisma/client";

// ── Pre-fill context passed from Funding Scout ───────────────────────────────

export interface ManualOpportunityPrefill {
  sourceName?: string;
  sourceUrl?: string;
  sourceClassification?: string;
  sourceIsVerifiedOpportunity?: boolean;
  categoryLabel?: string;
  fitReason?: string;
  searchTerm?: string;
  eligibilityTag?: GrantEligibilityTag;
  applicationStatus?: GrantWritingStage;
  applicantOrganization?: string;
  applicantTypeRequired?: string;
  nocapsCanApplyDirectly?: string;
  nocapsCanParticipateAsPartner?: string;
  partnerClientName?: string;
  nextAction?: string;
  riskNotes?: string;
  eligibilityNotes?: string;
}

// ── Category options ──────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "Mental Health",        label: "Mental Health" },
  { value: "Suicide Prevention",   label: "Suicide Prevention" },
  { value: "Behavioral Health",    label: "Behavioral Health" },
  { value: "Community Outreach",   label: "Community Outreach" },
  { value: "Youth Programs",       label: "Youth Programs" },
  { value: "Family Services",      label: "Family Services" },
  { value: "Health & Wellness",    label: "Health & Wellness" },
  { value: "Education",            label: "Education" },
  { value: "Arts & Culture",       label: "Arts & Culture" },
  { value: "Human Services",       label: "Human Services" },
  { value: "Capacity Building",    label: "Capacity Building" },
  { value: "Other",                label: "Other" },
];

const ELIGIBILITY_OPTIONS = Object.entries(GRANT_ELIGIBILITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const STAGE_OPTIONS = Object.entries(GRANT_STAGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// ── Form state type ───────────────────────────────────────────────────────────

interface FormState {
  title:               string;
  funder:              string;
  description:         string;
  category:            string;
  focusAreasRaw:       string; // comma-separated, split before send
  eligibility:         string;
  eligibilityTag:      GrantEligibilityTag;
  applicantOrganization: string;
  applicantTypeRequired: string;
  opportunityType:     string;
  openDate:            string;
  nocapsCanApplyDirectly: string;
  nocapsCanParticipateAsPartner: boolean;
  partnerClientName:   string;
  locationRestriction: string;
  sourceUrl:           string;
  applicationUrl:      string;
  deadline:            string;
  isRolling:           boolean;
  awardMin:            string;
  awardMax:            string;
  fundingAmount:       string;
  requiredDocumentsRaw: string;
  matchRequirement:    string;
  verificationDate:    string;
  verifiedBy:          string;
  samUeiRequirement:   string;
  applicationStatus:   GrantWritingStage;
  nextAction:          string;
  riskNotes:           string;
  eligibilityNotes:    string;
  requirements:        string;
}

interface FieldErrors {
  title?:       string;
  funder?:      string;
  description?: string;
  category?:    string;
  sourceUrl?:   string;
  [key: string]: string | undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  prefill: ManualOpportunityPrefill;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeComparableUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function ManualOpportunityForm({ prefill }: Props) {
  const router = useRouter();
  const isVerifiedPrefill =
    prefill.sourceIsVerifiedOpportunity || prefill.sourceClassification === "Verified Opportunity";
  const isResearchLead = !!prefill.sourceName && !isVerifiedPrefill;
  const sourceHomepageUrl = prefill.sourceUrl?.trim() ?? "";
  const unverifiedResearchNotes = prefill.fitReason
    ? `UNVERIFIED RESEARCH NOTES: ${prefill.fitReason}`
    : "";

  const [form, setForm] = useState<FormState>({
    title:               "",
    funder:              isVerifiedPrefill ? prefill.sourceName ?? "" : "",
    description:         "",
    category:            "",
    focusAreasRaw:       "",
    eligibility:         "",
    eligibilityTag:      prefill.eligibilityTag ?? "WATCHLIST_ONLY",
    applicantOrganization: prefill.applicantOrganization ?? "",
    applicantTypeRequired: prefill.applicantTypeRequired ?? "",
    opportunityType:     "",
    openDate:            "",
    nocapsCanApplyDirectly: prefill.nocapsCanApplyDirectly ?? "",
    nocapsCanParticipateAsPartner: prefill.nocapsCanParticipateAsPartner === "true",
    partnerClientName:   prefill.partnerClientName ?? "",
    locationRestriction: "",
    sourceUrl:           isVerifiedPrefill ? prefill.sourceUrl ?? "" : "",
    applicationUrl:      "",
    deadline:            "",
    isRolling:           false,
    awardMin:            "",
    awardMax:            "",
    fundingAmount:       "",
    requiredDocumentsRaw: "",
    matchRequirement:    "",
    verificationDate:    new Date().toISOString().slice(0, 10),
    verifiedBy:          "",
    samUeiRequirement:   "",
    applicationStatus:   prefill.applicationStatus ?? "FOUND",
    nextAction:          prefill.nextAction ?? "",
    riskNotes:           prefill.riskNotes ?? "",
    eligibilityNotes:    isVerifiedPrefill ? prefill.eligibilityNotes ?? "" : "",
    requirements:        isVerifiedPrefill
      ? prefill.fitReason ? `Potential fit: ${prefill.fitReason}` : ""
      : unverifiedResearchNotes,
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    setApiError(null);
  }

  function usesResearchHomepageAsOpportunityUrl(): boolean {
    return (
      isResearchLead &&
      !!sourceHomepageUrl &&
      normalizeComparableUrl(form.sourceUrl) === normalizeComparableUrl(sourceHomepageUrl)
    );
  }

  function hasRequiredVerificationFields(): boolean {
    return (
      !!form.title.trim() &&
      !!form.funder.trim() &&
      form.description.trim().length >= 10 &&
      !!form.category &&
      !!form.applicantTypeRequired.trim() &&
      !!form.eligibility.trim() &&
      !!form.opportunityType.trim() &&
      (!!form.deadline || form.isRolling) &&
      !!form.eligibilityNotes.trim() &&
      !!form.matchRequirement.trim() &&
      !!form.verificationDate &&
      !!form.verifiedBy.trim() &&
      !!form.sourceUrl.trim() &&
      isValidUrl(form.sourceUrl.trim()) &&
      !usesResearchHomepageAsOpportunityUrl() &&
      (!form.applicationUrl.trim() || isValidUrl(form.applicationUrl.trim()))
    );
  }

  // ── Client-side validation ────────────────────────────────────────────────

  function validate(): boolean {
    const next: FieldErrors = {};

    if (!form.title.trim())
      next.title = "Title is required.";
    if (!form.funder.trim())
      next.funder = "Funder name is required.";
    if (!form.description.trim() || form.description.trim().length < 10)
      next.description = "Description is required (at least 10 characters).";
    if (!form.category)
      next.category = "Category is required.";
    if (!form.applicantTypeRequired.trim())
      next.applicantTypeRequired = "Applicant type is required.";
    if (!form.eligibility.trim())
      next.eligibility = "Applicant eligibility is required.";
    if (!form.opportunityType.trim())
      next.opportunityType = "Opportunity type is required.";
    if (!form.deadline && !form.isRolling)
      next.deadline = "Enter a deadline or mark the opportunity as rolling/no deadline.";
    if (!form.matchRequirement.trim())
      next.matchRequirement = "Match requirement is required. Enter 'None' if there is no match.";
    if (!form.eligibilityNotes.trim())
      next.eligibilityNotes = "Eligibility notes are required.";
    if (!form.verificationDate)
      next.verificationDate = "Verification date is required.";
    if (!form.verifiedBy.trim())
      next.verifiedBy = "Verified by is required.";
    if (!form.sourceUrl.trim())
      next.sourceUrl = "Source URL is required. Do not save unsourced grant leads.";
    else if (!isValidUrl(form.sourceUrl.trim()))
      next.sourceUrl = "Must be a valid URL starting with https://";
    else if (usesResearchHomepageAsOpportunityUrl())
      next.sourceUrl = "Enter the exact official opportunity URL, not the source homepage.";
    if (form.applicationUrl.trim()) {
      if (!isValidUrl(form.applicationUrl.trim())) {
        next.applicationUrl = "Must be a valid URL or leave blank.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setApiError(null);

    const focusAreas = form.focusAreasRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const requiredDocuments = form.requiredDocumentsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title:               form.title.trim(),
      funder:              form.funder.trim(),
      description:         form.description.trim(),
      category:            form.category,
      focusAreas,
      eligibility:         form.eligibility.trim() || null,
      eligibilityTag:      form.eligibilityTag,
      applicantOrganization: form.applicantOrganization.trim() || null,
      applicantTypeRequired: form.applicantTypeRequired.trim() || null,
      opportunityType:     form.opportunityType.trim(),
      openDate:            form.openDate || null,
      nocapsCanApplyDirectly:
        form.nocapsCanApplyDirectly === ""
          ? null
          : form.nocapsCanApplyDirectly === "true",
      nocapsCanParticipateAsPartner: form.nocapsCanParticipateAsPartner,
      partnerClientName:   form.partnerClientName.trim() || null,
      locationRestriction: form.locationRestriction.trim() || null,
      sourceUrl:           form.sourceUrl.trim(),
      applicationUrl:      form.applicationUrl.trim() || null,
      deadline:            form.deadline || null,
      isRolling:           form.isRolling,
      awardMin:            form.awardMin ? parseFloat(form.awardMin) : null,
      awardMax:            form.awardMax ? parseFloat(form.awardMax) : null,
      fundingAmount:       form.fundingAmount.trim() || null,
      requiredDocuments,
      matchRequirement:    form.matchRequirement.trim() || null,
      verificationDate:    form.verificationDate,
      verifiedBy:          form.verifiedBy.trim(),
      samUeiRequirement:   form.samUeiRequirement.trim() || null,
      applicationStatus:   form.applicationStatus,
      nextAction:          form.nextAction.trim() || null,
      riskNotes:           form.riskNotes.trim() || null,
      eligibilityNotes:    form.eligibilityNotes.trim() || null,
      requirements:        form.requirements.trim() || null,
    };

    try {
      const res = await fetch("/api/opportunities/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as { success?: boolean; data?: { id: string; title: string }; error?: string; details?: Record<string, string[]> };

      if (!res.ok || !json.success) {
        // Show field-level API errors if any
        if (json.details) {
          const apiFieldErrors: FieldErrors = {};
          for (const [field, msgs] of Object.entries(json.details)) {
            if (Array.isArray(msgs)) apiFieldErrors[field] = msgs[0];
          }
          if (Object.keys(apiFieldErrors).length > 0) {
            setErrors(apiFieldErrors);
            setSaving(false);
            return;
          }
        }
        throw new Error(json.error ?? "Failed to save.");
      }

      // Success — redirect to the grant detail page
      const id = json.data?.id;
      if (id) {
        router.push(`/grants/${id}`);
      } else {
        router.push("/search?saved=1");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error. Please try again.";
      setApiError(msg);
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showForProfitWarning = shouldWarnForProfitApplicant({
    eligibilityTag: form.eligibilityTag,
    applicantTypeRequired: form.applicantTypeRequired,
    nocapsCanApplyDirectly:
      form.nocapsCanApplyDirectly === ""
        ? null
        : form.nocapsCanApplyDirectly === "true",
  });
  const canSave = hasRequiredVerificationFields();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Context banner (if pre-filled from Funding Scout) ─────────── */}
      {(prefill.sourceName || prefill.categoryLabel) && (
        <div className="flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-lg px-4 py-3">
          <Info size={15} className="shrink-0 mt-0.5 text-brand-500" />
          <div className="text-sm text-brand-800">
            <p className="font-medium mb-0.5">
              {isVerifiedPrefill ? "Pre-filled from Funding Scout" : "Funding Scout research context"}
            </p>
            {prefill.sourceName && (
              <p className="text-xs text-brand-700">
                Source: <strong>{prefill.sourceName}</strong>
                {prefill.categoryLabel && ` - ${prefill.categoryLabel}`}
              </p>
            )}
            {prefill.sourceClassification && (
              <p className="text-xs text-brand-600 mt-0.5">
                Classification: {prefill.sourceClassification}
              </p>
            )}
            {prefill.searchTerm && (
              <p className="text-xs text-brand-600 mt-0.5">
                Search term used: &ldquo;{prefill.searchTerm}&rdquo;
              </p>
            )}
            {isResearchLead && sourceHomepageUrl && (
              <p className="text-xs text-brand-600 mt-0.5">
                Source homepage:{" "}
                <a
                  href={sourceHomepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  {sourceHomepageUrl}
                </a>
              </p>
            )}
            {isResearchLead && prefill.fitReason && (
              <p className="text-xs text-brand-600 mt-0.5">
                Internal research notes are unverified and have not been copied into verified opportunity fields.
              </p>
            )}
          </div>
        </div>
      )}

      {isResearchLead && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-4">
          <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-600" />
          <p className="text-sm text-amber-900 leading-relaxed">
            This is a research lead, not a verified grant. Find a specific current program and confirm its official details before saving.
          </p>
        </div>
      )}

      {/* ── Verification warning ──────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-4">
        <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-900 mb-1">
            Verify before saving
          </p>
          <p className="text-sm text-amber-800 leading-relaxed">
            Only save this after verifying details directly with the funder.
            Do not guess deadlines, eligibility, award amounts, or requirements.
            Unverified details can lead to wasted effort on ineligible applications.
          </p>
        </div>
      </div>

      {/* ── Required fields ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Required Information</CardTitle>
          <span className="text-xs text-gray-400 font-normal">All fields below must be filled</span>
        </CardHeader>

        <div className="space-y-4">
          <Input
            label="Grant / opportunity title"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Kicking The Stigma Action Grant 2025"
            error={errors.title}
          />
          <Input
            label="Funder name"
            required
            value={form.funder}
            onChange={(e) => update("funder", e.target.value)}
            placeholder="e.g. Indianapolis Colts Foundation"
            error={errors.funder}
          />
          <Textarea
            label="Description"
            required
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={4}
            placeholder="Describe what this grant funds, who it's for, and what activities or programs are eligible..."
            hint="Based on your own reading of the funder's website — do not copy AI-generated descriptions without verifying them."
            error={errors.description}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              required
              options={CATEGORY_OPTIONS}
              placeholder="Select a category"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              error={errors.category}
            />
            <Input
              label="Focus area tags"
              value={form.focusAreasRaw}
              onChange={(e) => update("focusAreasRaw", e.target.value)}
              placeholder="suicide prevention, peer support, stigma"
              hint="Comma-separated. Used in search and filtering."
            />
          </div>
          <div>
            <Input
              label="Source URL"
              required
              type="url"
              value={form.sourceUrl}
              onChange={(e) => update("sourceUrl", e.target.value)}
              placeholder="https://www.kickingthestigma.com/grants"
              hint="The exact URL where you found or verified this grant. Required — unsourced leads cannot be saved."
              error={errors.sourceUrl}
            />
            {form.sourceUrl && !errors.sourceUrl && (
              <a
                href={form.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-xs text-brand-600 hover:underline"
              >
                <ExternalLink size={11} />
                Open source to verify
              </a>
            )}
          </div>
        </div>
      </Card>

      {/* ── Eligibility & Location ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Eligibility & Location</CardTitle>
          <span className="text-xs text-gray-400 font-normal">Fill in only what you&apos;ve confirmed</span>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Eligibility lane"
              options={ELIGIBILITY_OPTIONS}
              value={form.eligibilityTag}
              onChange={(e) => update("eligibilityTag", e.target.value as GrantEligibilityTag)}
              hint="Keeps direct NoCapsAI grants separate from partner/client leads."
            />
            <Select
              label="Grant-writing stage"
              options={STAGE_OPTIONS}
              value={form.applicationStatus}
              onChange={(e) => update("applicationStatus", e.target.value as GrantWritingStage)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Applicant organization"
              value={form.applicantOrganization}
              onChange={(e) => update("applicantOrganization", e.target.value)}
              placeholder="NoCapsAI LLC, Twizted Journeys, Dedicated Dads..."
            />
            <Input
              label="Required applicant type"
              required
              value={form.applicantTypeRequired}
              onChange={(e) => update("applicantTypeRequired", e.target.value)}
              placeholder="501(c)(3), public entity, small business, school..."
              error={errors.applicantTypeRequired}
            />
          </div>
          {showForProfitWarning && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <p className="text-sm text-amber-900">
                {FOR_PROFIT_APPLICANT_WARNING}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Can NoCapsAI apply directly?"
              options={[
                { value: "", label: "Unknown" },
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ]}
              value={form.nocapsCanApplyDirectly}
              onChange={(e) => update("nocapsCanApplyDirectly", e.target.value)}
            />
            <Input
              label="Partner/client name"
              value={form.partnerClientName}
              onChange={(e) => update("partnerClientName", e.target.value)}
              placeholder="Twizted Journeys, We Help Dads, client name..."
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.nocapsCanParticipateAsPartner}
              onChange={(e) => update("nocapsCanParticipateAsPartner", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-gray-700">
              NoCapsAI can participate as a contractor, vendor, or technical partner
            </span>
          </label>
          <Textarea
            label="Eligibility requirements"
            required
            value={form.eligibility}
            onChange={(e) => update("eligibility", e.target.value)}
            rows={3}
            placeholder="e.g. Indiana 501(c)(3) nonprofits focused on mental health outreach. Must not provide clinical treatment."
            hint="Copy from the funder's guidelines after verifying applicant eligibility."
            error={errors.eligibility}
          />
          <Input
            label="Location restriction"
            value={form.locationRestriction}
            onChange={(e) => update("locationRestriction", e.target.value)}
            placeholder="Indiana only, Shelby County preferred, National..."
            hint="Geographic restriction if any"
          />
          <Textarea
            label="Eligibility notes"
            required
            value={form.eligibilityNotes}
            onChange={(e) => update("eligibilityNotes", e.target.value)}
            rows={2}
            placeholder="Why this is direct, partner-only, watchlist, or not eligible..."
            error={errors.eligibilityNotes}
          />
          <Input
            label="Required documents"
            value={form.requiredDocumentsRaw}
            onChange={(e) => update("requiredDocumentsRaw", e.target.value)}
            placeholder="IRS letter, budget, board list, letters of support..."
            hint="Comma-separated. Keep verified document requirements here."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Match requirement"
              required
              value={form.matchRequirement}
              onChange={(e) => update("matchRequirement", e.target.value)}
              placeholder="None, 20% cash match, in-kind allowed..."
              error={errors.matchRequirement}
            />
            <Input
              label="SAM.gov / UEI requirement"
              value={form.samUeiRequirement}
              onChange={(e) => update("samUeiRequirement", e.target.value)}
              placeholder="Required, not required, verify..."
            />
          </div>
          <Textarea
            label="Next action"
            value={form.nextAction}
            onChange={(e) => update("nextAction", e.target.value)}
            rows={2}
            placeholder="Verify 501(c)(3) requirement, ask client for SAM status, draft budget..."
          />
          <Textarea
            label="Risk notes"
            value={form.riskNotes}
            onChange={(e) => update("riskNotes", e.target.value)}
            rows={2}
            placeholder="Eligibility concerns, deadline risk, missing documents, match risk..."
          />
        </div>
      </Card>

      {/* ── Award & Deadline ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Award & Deadline</CardTitle>
          <span className="text-xs text-gray-400 font-normal">Only enter verified figures</span>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Opportunity type"
              required
              options={[
                { value: "Grant", label: "Grant" },
                { value: "Contract", label: "Contract" },
                { value: "Vendor opportunity", label: "Vendor opportunity" },
                { value: "Loan / financing", label: "Loan / financing" },
                { value: "Investment", label: "Investment" },
                { value: "Tax credit / incentive", label: "Tax credit / incentive" },
                { value: "Technical assistance", label: "Technical assistance" },
              ]}
              placeholder="Select type"
              value={form.opportunityType}
              onChange={(e) => update("opportunityType", e.target.value)}
              error={errors.opportunityType}
            />
            <Input
              label="Open date"
              type="date"
              value={form.openDate}
              onChange={(e) => update("openDate", e.target.value)}
              hint="Leave blank if unknown"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Award minimum ($)"
              type="number"
              min={0}
              value={form.awardMin}
              onChange={(e) => update("awardMin", e.target.value)}
              placeholder="5000"
              hint="Leave blank if unconfirmed"
            />
            <Input
              label="Award maximum ($)"
              type="number"
              min={0}
              value={form.awardMax}
              onChange={(e) => update("awardMax", e.target.value)}
              placeholder="25000"
              hint="Leave blank if unconfirmed"
            />
          </div>
          <Input
            label="Funding amount notes"
            value={form.fundingAmount}
            onChange={(e) => update("fundingAmount", e.target.value)}
            placeholder="Up to $25,000, typical award $10,000, amount varies..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Application deadline"
              required={!form.isRolling}
              type="date"
              value={form.deadline}
              onChange={(e) => update("deadline", e.target.value)}
              disabled={form.isRolling}
              hint={form.isRolling ? "Disabled — rolling deadline selected" : "Leave blank if unconfirmed"}
              error={errors.deadline}
            />
            <div className="flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRolling}
                  onChange={(e) => {
                    update("isRolling", e.target.checked);
                    if (e.target.checked) update("deadline", "");
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-gray-700">Rolling deadline</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">Check if no fixed deadline</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Application Details ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <span className="text-xs text-gray-400 font-normal">Optional but helpful</span>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Verification date"
              required
              type="date"
              value={form.verificationDate}
              onChange={(e) => update("verificationDate", e.target.value)}
              error={errors.verificationDate}
            />
            <Input
              label="Verified by"
              required
              value={form.verifiedBy}
              onChange={(e) => update("verifiedBy", e.target.value)}
              placeholder="Nate, Tonya, staff member..."
              error={errors.verifiedBy}
            />
          </div>
          <div>
            <Input
              label="Direct application URL"
              type="url"
              value={form.applicationUrl}
              onChange={(e) => update("applicationUrl", e.target.value)}
              placeholder="https://grants.submittable.com/..."
              hint="Where to apply — different from the source URL if applicable"
              error={errors.applicationUrl}
            />
          </div>
          <Textarea
            label="Requirements & notes"
            value={form.requirements}
            onChange={(e) => update("requirements", e.target.value)}
            rows={4}
            placeholder="Required documents, word limits, application process notes, why this may be a fit, disqualifier checks done..."
            hint="Internal research notes — not shown to funders"
          />
        </div>
      </Card>

      {/* ── Verification reminder + Save ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Tracking Details</CardTitle>
          <span className="text-xs text-gray-400 font-normal">Used for grant-writing workflow and follow-up</span>
        </CardHeader>
        <div className="space-y-4">
          <Input
            label="Required documents"
            value={form.requiredDocumentsRaw}
            onChange={(e) => update("requiredDocumentsRaw", e.target.value)}
            placeholder="IRS letter, budget, board list, letters of support..."
            hint="Comma-separated. Keep verified document requirements here."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Match requirement"
              value={form.matchRequirement}
              onChange={(e) => update("matchRequirement", e.target.value)}
              placeholder="None, 20% cash match, in-kind allowed..."
            />
            <Input
              label="SAM.gov / UEI requirement"
              value={form.samUeiRequirement}
              onChange={(e) => update("samUeiRequirement", e.target.value)}
              placeholder="Required, not required, verify..."
            />
          </div>
          <Textarea
            label="Next action"
            value={form.nextAction}
            onChange={(e) => update("nextAction", e.target.value)}
            rows={2}
            placeholder="Verify 501(c)(3) requirement, ask client for SAM status, draft budget..."
          />
          <Textarea
            label="Risk notes"
            value={form.riskNotes}
            onChange={(e) => update("riskNotes", e.target.value)}
            rows={2}
            placeholder="Eligibility concerns, deadline risk, missing documents, match risk..."
          />
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
          <p className="text-sm text-red-800">
            <strong>Only save this after verifying details directly with the funder.</strong>{" "}
            Do not guess deadlines, eligibility, award amounts, or requirements.
          </p>
        </div>

        {apiError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={14} className="shrink-0 text-red-500" />
            {apiError}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Cancel
          </button>
          <Button
            type="submit"
            size="lg"
            loading={saving}
            disabled={!canSave}
            icon={<CheckCircle2 size={17} />}
          >
            {saving ? "Saving…" : "Save Verified Opportunity"}
          </Button>
        </div>
        {!canSave && (
          <p className="text-xs text-gray-500 text-right">
            Complete the verified title, funder, description, category, exact official source URL,
            eligibility, deadline or rolling status, opportunity type, match, and verifier fields to save.
          </p>
        )}
      </div>

    </form>
  );
}
