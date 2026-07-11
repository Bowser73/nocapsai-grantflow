import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/ui/topbar";
import {
  ManualOpportunityForm,
  type ManualOpportunityPrefill,
} from "@/components/opportunities/manual-opportunity-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { GrantEligibilityTag, GrantWritingStage } from "@prisma/client";

export const metadata = { title: "Add Manual Opportunity" };

const ELIGIBILITY_TAGS = new Set<string>([
  "DIRECT_NOCAPSAI_ELIGIBLE",
  "PARTNER_OR_CLIENT_ELIGIBLE",
  "WATCHLIST_ONLY",
  "NOT_ELIGIBLE",
]);

const WRITING_STAGES = new Set<string>([
  "FOUND",
  "ELIGIBILITY_REVIEW",
  "DOCUMENTS_NEEDED",
  "DRAFTING",
  "BUDGET_DRAFT",
  "INTERNAL_REVIEW",
  "CLIENT_REVIEW",
  "READY_TO_SUBMIT",
  "SUBMITTED",
  "AWARDED",
  "REJECTED",
  "WATCHLIST",
]);

const CURRENT_LOCAL_RESEARCH_LANE_TITLE =
  "Local Funding Research Lane: Rush County and Rural Indiana";

function normalizeSourceName(value?: string): string | undefined {
  if (
    value?.includes("Rush County") &&
    value.includes("Rural Indiana") &&
    value.includes("Digital Transformation")
  ) {
    return CURRENT_LOCAL_RESEARCH_LANE_TITLE;
  }
  return value ?? undefined;
}

function parseEligibilityTag(value?: string): GrantEligibilityTag | undefined {
  return value && ELIGIBILITY_TAGS.has(value) ? (value as GrantEligibilityTag) : undefined;
}

function parseWritingStage(value?: string): GrantWritingStage | undefined {
  return value && WRITING_STAGES.has(value) ? (value as GrantWritingStage) : undefined;
}

/**
 * Manual opportunity intake page.
 *
 * Accepts optional query params from Funding Scout source cards:
 *   ?sourceName=...&sourceUrl=...&categoryLabel=...&fitReason=...&searchTerm=...&sourceClassification=...
 *
 * All query params are used only for pre-filling — the user must
 * verify and complete all required fields before saving.
 */
export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: {
    sourceName?: string;
    sourceUrl?: string;
    categoryLabel?: string;
    fitReason?: string;
    searchTerm?: string;
    eligibilityTag?: string;
    applicationStatus?: string;
    applicantOrganization?: string;
    applicantTypeRequired?: string;
    nocapsCanApplyDirectly?: string;
    nocapsCanParticipateAsPartner?: string;
    partnerClientName?: string;
    nextAction?: string;
    riskNotes?: string;
    eligibilityNotes?: string;
    sourceClassification?: string;
    sourceIsVerifiedOpportunity?: string;
  };
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const prefill: ManualOpportunityPrefill = {
    sourceName:    normalizeSourceName(searchParams.sourceName),
    sourceUrl:     searchParams.sourceUrl     ?? undefined,
    categoryLabel: searchParams.categoryLabel ?? undefined,
    fitReason:     searchParams.fitReason     ?? undefined,
    searchTerm:    searchParams.searchTerm    ?? undefined,
    eligibilityTag: parseEligibilityTag(searchParams.eligibilityTag),
    applicationStatus: parseWritingStage(searchParams.applicationStatus),
    applicantOrganization: searchParams.applicantOrganization ?? undefined,
    applicantTypeRequired: searchParams.applicantTypeRequired ?? undefined,
    nocapsCanApplyDirectly: searchParams.nocapsCanApplyDirectly ?? undefined,
    nocapsCanParticipateAsPartner: searchParams.nocapsCanParticipateAsPartner ?? undefined,
    partnerClientName: searchParams.partnerClientName ?? undefined,
    nextAction: searchParams.nextAction ?? undefined,
    riskNotes: searchParams.riskNotes ?? undefined,
    eligibilityNotes: searchParams.eligibilityNotes ?? undefined,
    sourceClassification: searchParams.sourceClassification ?? undefined,
    sourceIsVerifiedOpportunity: searchParams.sourceIsVerifiedOpportunity === "true",
  };

  return (
    <div>
      <Topbar
        title="Add Manual Opportunity"
        userName={session.user.name ?? undefined}
      />

      <div className="p-6 max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href="/funding-scout"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Funding Scout
        </Link>

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Add Manually Verified Opportunity
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-prose">
            Use this form to save a grant lead you&apos;ve personally verified with the funder.
            Only save verified information — do not fill in guessed deadlines, award amounts,
            or eligibility criteria. Every saved opportunity must have a real source URL.
          </p>
        </div>

        <ManualOpportunityForm prefill={prefill} />
      </div>
    </div>
  );
}
