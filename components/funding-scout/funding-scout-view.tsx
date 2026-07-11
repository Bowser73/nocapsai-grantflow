"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  generateFundingScout,
  type FundingScoutReport,
  type OrgProfileSnapshot,
  type SearchStrategy,
  type SourceBucket,
  CATEGORY_META,
} from "@/lib/funding-scout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Radar,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Lightbulb,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Loader2,
  PlusCircle,
  Wallet,
  ListChecks,
} from "lucide-react";

interface FundingScoutViewProps {
  org: OrgProfileSnapshot;
}

const PRIORITY_BADGE: Record<
  SearchStrategy["priority"],
  { label: string; className: string }
> = {
  high:   { label: "High Priority",   className: "bg-green-100 text-green-700" },
  medium: { label: "Medium Priority", className: "bg-amber-100 text-amber-700" },
  low:    { label: "Low Priority",    className: "bg-gray-100 text-gray-500"   },
};

// Build the query string for the "Create Manual Opportunity" link
function buildNewOpportunityUrl(params: {
  sourceName: string;
  sourceUrl:  string;
  categoryLabel: string;
  sourceClassification?: string;
  sourceIsVerifiedOpportunity?: boolean;
  fitReason:  string;
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
}): string {
  const qs = new URLSearchParams();
  qs.set("sourceName",    params.sourceName);
  qs.set("sourceUrl",     params.sourceUrl);
  qs.set("categoryLabel", params.categoryLabel);
  qs.set("fitReason",     params.fitReason);
  if (params.sourceClassification) qs.set("sourceClassification", params.sourceClassification);
  if (params.sourceIsVerifiedOpportunity != null) {
    qs.set("sourceIsVerifiedOpportunity", String(params.sourceIsVerifiedOpportunity));
  }
  if (params.searchTerm) qs.set("searchTerm", params.searchTerm);
  if (params.eligibilityTag) qs.set("eligibilityTag", params.eligibilityTag);
  if (params.applicationStatus) qs.set("applicationStatus", params.applicationStatus);
  if (params.applicantOrganization) qs.set("applicantOrganization", params.applicantOrganization);
  if (params.applicantTypeRequired) qs.set("applicantTypeRequired", params.applicantTypeRequired);
  if (params.nocapsCanApplyDirectly) qs.set("nocapsCanApplyDirectly", params.nocapsCanApplyDirectly);
  if (params.nocapsCanParticipateAsPartner) qs.set("nocapsCanParticipateAsPartner", params.nocapsCanParticipateAsPartner);
  if (params.partnerClientName) qs.set("partnerClientName", params.partnerClientName);
  if (params.nextAction) qs.set("nextAction", params.nextAction);
  if (params.riskNotes) qs.set("riskNotes", params.riskNotes);
  if (params.eligibilityNotes) qs.set("eligibilityNotes", params.eligibilityNotes);
  return `/opportunities/new?${qs.toString()}`;
}

type RecommendedMoveLane = "NoCapsAI Direct" | "Partner/Client" | "Watchlist" | "Skip";
type RecommendedMovePriority = "High" | "Medium" | "Low";
type RecommendedMoveAction =
  | "Research Source"
  | "Verify Eligibility"
  | "Find Current Program"
  | "Mark as Watchlist"
  | "Assign to Partner/Client"
  | "Skip";

interface RecommendedMove {
  title: string;
  lane: RecommendedMoveLane;
  why: string;
  nextAction: string;
  priority: RecommendedMovePriority;
  actionLabel: RecommendedMoveAction;
  sourceIds: string[];
  applicantTypeRequired?: string;
  nocapsCanApplyDirectly?: boolean;
  partnerRole?: boolean;
  riskNotes?: string;
}

const LANE_BADGE: Record<RecommendedMoveLane, string> = {
  "NoCapsAI Direct": "bg-green-100 text-green-700",
  "Partner/Client": "bg-blue-100 text-blue-700",
  Watchlist: "bg-gray-100 text-gray-600",
  Skip: "bg-red-100 text-red-700",
};

const MOVE_PRIORITY_BADGE: Record<RecommendedMovePriority, string> = {
  High: "bg-green-100 text-green-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-gray-100 text-gray-500",
};

type SourceFilter =
  | "ALL"
  | "GRANTS"
  | "CONTRACTS"
  | "VENDOR_OPPORTUNITIES"
  | "LOANS_FINANCING"
  | "INVESTMENT"
  | "TAX_CREDITS"
  | "TECHNICAL_ASSISTANCE"
  | "RESEARCH_SOURCES";

const SOURCE_FILTERS: { id: SourceFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "GRANTS", label: "Grants" },
  { id: "CONTRACTS", label: "Contracts" },
  { id: "VENDOR_OPPORTUNITIES", label: "Vendor Opportunities" },
  { id: "LOANS_FINANCING", label: "Loans / Financing" },
  { id: "INVESTMENT", label: "Investment" },
  { id: "TAX_CREDITS", label: "Tax Credits / Incentives" },
  { id: "TECHNICAL_ASSISTANCE", label: "Technical Assistance" },
  { id: "RESEARCH_SOURCES", label: "Research Sources" },
];

function sourceMatchesFilter(bucket: SourceBucket, filter: SourceFilter): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "GRANTS":
      return bucket.fundingMechanism === "GRANT";
    case "CONTRACTS":
      return bucket.fundingMechanism === "CONTRACT";
    case "VENDOR_OPPORTUNITIES":
      return bucket.fundingMechanism === "VENDOR_OPPORTUNITY";
    case "LOANS_FINANCING":
      return bucket.fundingMechanism === "LOAN_OR_FINANCING";
    case "INVESTMENT":
      return bucket.fundingMechanism === "EQUITY_INVESTMENT";
    case "TAX_CREDITS":
      return bucket.fundingMechanism === "TAX_CREDIT_OR_INCENTIVE";
    case "TECHNICAL_ASSISTANCE":
      return bucket.fundingMechanism === "TECHNICAL_ASSISTANCE";
    case "RESEARCH_SOURCES":
      return bucket.fundingMechanism === "RESEARCH_SOURCE";
  }
}

const SOURCE_BADGE_CLASS: Record<SourceBucket["fundingMechanism"], string> = {
  GRANT: "bg-green-50 text-green-700 border-green-200",
  CONTRACT: "bg-sky-50 text-sky-700 border-sky-200",
  VENDOR_OPPORTUNITY: "bg-blue-50 text-blue-700 border-blue-200",
  LOAN_OR_FINANCING: "bg-amber-50 text-amber-700 border-amber-200",
  EQUITY_INVESTMENT: "bg-purple-50 text-purple-700 border-purple-200",
  TAX_CREDIT_OR_INCENTIVE: "bg-teal-50 text-teal-700 border-teal-200",
  TECHNICAL_ASSISTANCE: "bg-gray-50 text-gray-700 border-gray-200",
  RESEARCH_SOURCE: "bg-orange-50 text-orange-700 border-orange-200",
};

function getRecommendedMoves(report: FundingScoutReport): RecommendedMove[] {
  const businessProfile = !!report.fundingBuckets?.length;
  if (!businessProfile) {
    return [
      {
        title: "Verify local and Indiana sources first",
        lane: "Partner/Client",
        why: "The strongest nonprofit-style opportunities are usually local or state sources, but Scout data is strategic until the source is verified.",
        nextAction: "Open the top local or Indiana source, confirm open status, deadline, applicant type, and required documents.",
        priority: "High",
        actionLabel: "Assign to Partner/Client",
        sourceIds: ["shelby-county", "indiana-fssa-dmha", "prevention-insights"],
        applicantTypeRequired: "Eligible nonprofit, public entity, or community partner",
        nocapsCanApplyDirectly: false,
        partnerRole: true,
      },
      {
        title: "Move restricted clinical, school, or government leads out of direct work",
        lane: "Skip",
        why: "These are frequent disqualifiers unless a qualified applicant owns the application.",
        nextAction: "Skip direct application; only revive if an eligible applicant asks NoCapsAI to support the work.",
        priority: "Medium",
        actionLabel: "Skip",
        sourceIds: ["grants-gov"],
        applicantTypeRequired: "Verify source first",
        nocapsCanApplyDirectly: false,
        riskNotes: "Verify source first. Do not list NoCapsAI as applicant unless the funder allows for-profit entities.",
      },
    ];
  }

  return [
    {
      title: "Start with rural Indiana digital transformation and tech adoption programs",
      lane: "NoCapsAI Direct",
      why: "This is the strongest near-term lane for an Indiana for-profit AI/software company: rural small-business automation, websites, workflow tools, and technology adoption.",
      nextAction: "Verify source first: confirm a current local, OCRA, chamber, utility, bank, or community foundation program is open and explicitly supports for-profit technology adoption.",
      priority: "High",
      actionLabel: "Research Source",
      sourceIds: ["local-digital-transformation", "iedc-incentives"],
      applicantTypeRequired: "For-profit small business or Indiana technology company",
      nocapsCanApplyDirectly: true,
      partnerRole: false,
    },
    {
      title: "Use Indiana SBDC, TechPoint, and Indy Chamber as referral sources",
      lane: "Watchlist",
      why: "These organizations are useful for advice, introductions, and program discovery, but they should not be treated as direct grant funders without a verified live program.",
      nextAction: "Ask for referrals to current grants, pitch competitions, incentives, financing, procurement, or technical-assistance programs before saving an opportunity.",
      priority: "High",
      actionLabel: "Mark as Watchlist",
      sourceIds: ["indiana-sbdc", "techpoint", "indy-chamber"],
      applicantTypeRequired: "Referral or verified downstream program",
      nocapsCanApplyDirectly: false,
      partnerRole: false,
      riskNotes: "Advisory organization only until a specific active funding, pitch, loan, incentive, or procurement program is verified.",
    },
    {
      title: "Check startup accelerators and pitch competitions",
      lane: "NoCapsAI Direct",
      why: "Pitch and accelerator programs can fit software/startup growth better than generic nonprofit foundation grants.",
      nextAction: "Verify source first, then only advance if GrantFlow is positioned as a software product with a clear startup narrative, traction plan, and use of funds.",
      priority: "High",
      actionLabel: "Verify Eligibility",
      sourceIds: ["elevate-ventures"],
      applicantTypeRequired: "Indiana startup, software company, or tech ecosystem participant",
      nocapsCanApplyDirectly: true,
      partnerRole: false,
      riskNotes: "Do not assume a grant exists; verify whether the active program is a grant, investment, pitch competition, accelerator, or advisory support.",
    },
    {
      title: "Treat SBIR/STTR and NSF Seed Fund as R&D watchlist",
      lane: "Watchlist",
      why: "Funding fit can be strong, but application effort and registration burden are high and deadlines should not be assumed from Scout strategy data.",
      nextAction: "Verify source first; only advance after defining a clear R&D/product development plan, commercialization angle, SAM.gov/UEI readiness, and Project Pitch path.",
      priority: "Medium",
      actionLabel: "Mark as Watchlist",
      sourceIds: ["sba-sbir", "nsf-seed-fund"],
      applicantTypeRequired: "For-profit small business with R&D/product development plan",
      nocapsCanApplyDirectly: true,
      partnerRole: false,
      riskNotes: "Watchlist unless there is a clear R&D/product development plan. Do not claim an open deadline until verified at the source.",
    },
    {
      title: "Track government contracts and subcontracts separately from grants",
      lane: "NoCapsAI Direct",
      why: "Procurement can fund AI automation, software, websites, and workflow services without requiring nonprofit status.",
      nextAction: "Verify SAM.gov, Indiana procurement, subcontracting, NAICS fit, registration requirements, and open solicitation status.",
      priority: "High",
      actionLabel: "Research Source",
      sourceIds: ["government-contracting"],
      applicantTypeRequired: "For-profit vendor, small business, subcontractor, or registered supplier",
      nocapsCanApplyDirectly: true,
      partnerRole: false,
      riskNotes: "Treat as contracting, not grant funding. Confirm registrations and procurement rules before pursuing.",
    },
    {
      title: "Move 501(c)(3)-only, government-only, and nonprofit-only opportunities to partner/client lane",
      lane: "Partner/Client",
      why: "These may still be useful, but NoCapsAI LLC should support an eligible applicant instead of being listed as lead applicant.",
      nextAction: "Assign to an eligible nonprofit, public entity, school, or client; position NoCapsAI as grant writer, vendor, contractor, or technical partner.",
      priority: "High",
      actionLabel: "Verify Eligibility",
      sourceIds: ["nonprofit-vendor", "grants-gov-biz"],
      applicantTypeRequired: "501(c)(3), government/public entity, nonprofit, school, or eligible partner",
      nocapsCanApplyDirectly: false,
      partnerRole: true,
      riskNotes: "Do not list NoCapsAI LLC as applicant unless the funder explicitly allows for-profit entities.",
    },
  ];
}

function getMoveUrl(report: FundingScoutReport, move: RecommendedMove): string {
  const source =
    report.sourceBuckets.find((bucket) => move.sourceIds.includes(bucket.id)) ??
    report.sourceBuckets[0];
  const meta = source ? CATEGORY_META[source.category] : null;
  const eligibilityTag =
    move.lane === "NoCapsAI Direct"
      ? "DIRECT_NOCAPSAI_ELIGIBLE"
      : move.lane === "Partner/Client"
      ? "PARTNER_OR_CLIENT_ELIGIBLE"
      : move.lane === "Skip"
      ? "NOT_ELIGIBLE"
      : "WATCHLIST_ONLY";

  return buildNewOpportunityUrl({
    sourceName: source?.name ?? move.title,
    sourceUrl: source?.url ?? "https://example.com/verify-source-first",
    categoryLabel: meta?.label ?? move.lane,
    sourceClassification: source?.badgeLabel,
    sourceIsVerifiedOpportunity: source?.canAddVerifiedOpportunity ?? false,
    fitReason: `${move.why} ${move.nextAction}`,
    searchTerm: source?.recommendedSearchTerms[0],
    eligibilityTag,
    applicationStatus: move.lane === "Watchlist" || move.lane === "Skip" ? "WATCHLIST" : "ELIGIBILITY_REVIEW",
    applicantOrganization: move.lane === "NoCapsAI Direct" ? report.orgName : "",
    applicantTypeRequired: move.applicantTypeRequired,
    nocapsCanApplyDirectly:
      move.nocapsCanApplyDirectly == null ? undefined : String(move.nocapsCanApplyDirectly),
    nocapsCanParticipateAsPartner: move.partnerRole ? "true" : undefined,
    nextAction: move.nextAction,
    riskNotes: move.riskNotes,
    eligibilityNotes: "Verify source first. Funding Scout provides strategy guidance, not confirmed open opportunities or deadlines.",
  });
}

export function FundingScoutView({ org }: FundingScoutViewProps) {
  const [report, setReport]                     = useState<FundingScoutReport | null>(null);
  const [running, setRunning]                   = useState(false);
  const [expandedSources, setExpandedSources]   = useState<Set<string>>(new Set());
  const [expandedDisqualifiers, setExpandedDisqualifiers] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");

  useEffect(() => {
    setReport(null);
    setExpandedSources(new Set());
    setExpandedDisqualifiers(false);
    setSourceFilter("ALL");
  }, [org.name, org.orgType]);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setReport(generateFundingScout(org));
      setRunning(false);
    }, 700);
  };

  const toggleSource = (id: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const profileIncomplete = (org.profileCompleteness ?? 0) < 40;
  const visibleSources = report
    ? report.sourceBuckets.filter((bucket) => sourceMatchesFilter(bucket, sourceFilter))
    : [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Hero / Run Card ─────────────────────────────────────────────── */}
      <Card className="border-brand-200 bg-gradient-to-r from-brand-50 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Radar className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-semibold text-gray-900">Funding Scout</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Analyzes your organization profile and generates a prioritized funding strategy —
              search terms, source buckets, fit angles, and disqualifier warnings.
              No fabricated results: every source needs manual or live verification.
            </p>
            {profileIncomplete && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                Your profile is {org.profileCompleteness ?? 0}% complete. Add your mission
                statement, programs, and location for better results.
              </div>
            )}
          </div>
          <div className="shrink-0">
            <Button
              size="lg"
              onClick={handleRun}
              disabled={running}
              icon={running ? undefined : <Radar size={17} />}
              className="w-full sm:w-auto"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Analyzing profile…
                </>
              ) : report ? (
                "Re-run Scout"
              ) : (
                "Run Funding Scout"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Loading placeholder ─────────────────────────────────────────── */}
      {running && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
          <p className="text-sm font-medium">Analyzing organization profile…</p>
        </div>
      )}

      {/* ── Report ─────────────────────────────────────────────────────── */}
      {report && !running && (
        <div className="space-y-6">

          {/* Generated timestamp */}
          <p className="text-xs text-gray-400">
            Scout generated for <strong className="text-gray-600">{report.orgName}</strong>{" "}
            at {report.generatedAt.toLocaleTimeString()}
          </p>

          {/* ── Funding Buckets (business profiles) ─────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ListChecks size={17} className="text-brand-600" />
                <CardTitle>Recommended Next Moves</CardTitle>
              </div>
              <span className="text-xs text-gray-400 font-normal">
                Ranked by eligibility, local/state fit, effort, funding fit, and watchlist risk
              </span>
            </CardHeader>
            <div className="space-y-3">
              {getRecommendedMoves(report).map((move, index) => {
                const source = report.sourceBuckets.find((bucket) =>
                  move.sourceIds.includes(bucket.id)
                );
                const moveUrl = source?.url ?? "/funding-scout";
                return (
                  <div
                    key={move.title}
                    className="rounded-md border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {move.title}
                            </p>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${LANE_BADGE[move.lane]}`}>
                              {move.lane}
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${MOVE_PRIORITY_BADGE[move.priority]}`}>
                              {move.priority}
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                              Verify source first
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            <span className="font-semibold text-gray-700">Why:</span> {move.why}
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed mt-1">
                            <span className="font-semibold text-gray-700">Next:</span> {move.nextAction}
                          </p>
                        </div>
                      </div>
                      <a
                        href={moveUrl}
                        target={moveUrl.startsWith("http") ? "_blank" : undefined}
                        rel={moveUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="shrink-0"
                      >
                        <Button
                          size="sm"
                          variant={move.lane === "Skip" ? "ghost" : "secondary"}
                          icon={move.actionLabel === "Research Source" ? <Search size={14} /> : undefined}
                        >
                          {move.actionLabel}
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {report.fundingBuckets && report.fundingBuckets.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wallet size={17} className="text-brand-600" />
                  <CardTitle>Funding Buckets</CardTitle>
                </div>
                <span className="text-xs text-gray-400 font-normal">
                  Sort each opportunity into a bucket by size & purpose
                </span>
                <p className="text-xs text-gray-500">
                  These are planning ranges for sorting opportunities, not guaranteed award limits.
                </p>
              </CardHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.fundingBuckets.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-md border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-brand-700 bg-brand-50 rounded-full px-2 py-0.5 shrink-0">
                        Bucket {b.number}
                      </span>
                      <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                    </div>
                    <p className="text-xs font-medium text-gray-600">{b.amountRange}</p>
                    <p className="text-xs text-gray-500 mt-1">{b.purpose}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Priority Search Terms ─────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search size={17} className="text-brand-600" />
                <CardTitle>Priority Search Terms</CardTitle>
              </div>
              <span className="text-xs text-gray-400 font-normal">
                {report.searchStrategies.length} strategies ranked by priority
              </span>
            </CardHeader>
            <div className="space-y-2">
              {report.searchStrategies.map((s, i) => {
                const badge = PRIORITY_BADGE[s.priority];
                return (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 py-2.5 px-3 rounded-md bg-gray-50 border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 font-mono tracking-tight">
                        &ldquo;{s.term}&rdquo;
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sources: {s.suggestedSources.join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-gray-400">{s.categoryLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ── Source Buckets ───────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink size={16} className="text-brand-600" />
              <h3 className="text-base font-semibold text-gray-900">
                Ranked Sources
              </h3>
              <span className="text-xs text-gray-400">(A = highest priority)</span>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {SOURCE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSourceFilter(filter.id)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    sourceFilter === filter.id
                      ? "border-brand-300 bg-brand-50 text-brand-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {visibleSources.length === 0 && (
                <div className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                  No sources in this filter for {report.orgName}.
                </div>
              )}
              {visibleSources.map((bucket) => {
                const meta = CATEGORY_META[bucket.category];
                const isExpanded = expandedSources.has(bucket.id);
                const newOpportunityUrl = buildNewOpportunityUrl({
                  sourceName:    bucket.name,
                  sourceUrl:     bucket.url,
                  categoryLabel: meta.label,
                  sourceClassification: bucket.badgeLabel,
                  sourceIsVerifiedOpportunity: bucket.canAddVerifiedOpportunity,
                  fitReason:     bucket.fitReason,
                  searchTerm:    bucket.recommendedSearchTerms[0],
                });

                return (
                  <Card key={bucket.id} className="p-0 overflow-hidden">
                    {/* Header row — toggle */}
                    <button
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => toggleSource(bucket.id)}
                    >
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.badgeClass}`}>
                        {bucket.category}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{bucket.name}</p>
                        <p className="text-xs text-gray-500">{meta.label}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SOURCE_BADGE_CLASS[bucket.fundingMechanism]}`}>
                            {bucket.badgeLabel}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                            {bucket.verificationLabel}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {bucket.verificationNeeded ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <AlertTriangle size={10} />
                            {bucket.verificationLabel}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                            <CheckCircle2 size={10} />
                            {bucket.verificationLabel}
                          </span>
                        )}
                        {isExpanded
                          ? <ChevronUp size={15} className="text-gray-400" />
                          : <ChevronDown size={15} className="text-gray-400" />
                        }
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-gray-100 space-y-4 bg-gray-50/50">
                        <p className="text-sm text-gray-600 pt-3">{bucket.description}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="rounded-md border border-gray-100 bg-white px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase text-gray-400">Organization eligibility</p>
                            <p className="text-xs text-gray-700 mt-0.5">{bucket.eligibilityLabel}</p>
                          </div>
                          <div className="rounded-md border border-gray-100 bg-white px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase text-gray-400">Deadline status</p>
                            <p className="text-xs text-gray-700 mt-0.5">{bucket.deadlineStatus}</p>
                          </div>
                          <div className="rounded-md border border-gray-100 bg-white px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase text-gray-400">Funding mechanism</p>
                            <p className="text-xs text-gray-700 mt-0.5">{bucket.badgeLabel}</p>
                          </div>
                          <div className="rounded-md border border-gray-100 bg-white px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase text-gray-400">Last verified</p>
                            <p className="text-xs text-gray-700 mt-0.5">{bucket.lastVerifiedDate ?? "Not verified as a current opportunity"}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Why it may fit
                          </p>
                          <p className="text-sm text-gray-700">{bucket.fitReason}</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Recommended Search Terms
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {bucket.recommendedSearchTerms.map((term, i) => (
                              <span
                                key={i}
                                className="text-xs bg-white border border-gray-200 rounded-md px-2.5 py-1 text-gray-700 font-mono"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>

                        {bucket.verificationNeeded && (
                          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 text-xs text-amber-800">
                            <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                            <span>
                              <strong>Manual verification needed.</strong> This source cannot be
                              treated as a confirmed opportunity yet. Visit the source URL, use the
                              recommended search terms above, and verify open status, applicant type,
                              funding mechanism, and eligibility before saving.
                            </span>
                          </div>
                        )}

                        {/* ── Action row ── */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                          <a
                            href={bucket.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                          >
                            <ExternalLink size={12} />
                            Visit {bucket.name}
                          </a>

                          {bucket.canAddVerifiedOpportunity ? (
                            <Link href={newOpportunityUrl}>
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={<PlusCircle size={14} />}
                              >
                                Add Verified Opportunity
                              </Button>
                            </Link>
                          ) : (
                            <a
                              href={bucket.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex"
                            >
                              <Button size="sm" variant="secondary" icon={<Search size={14} />}>
                                {bucket.researchActionLabel}
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ── Two-column: Project Angles + Do Not Chase ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Best Fit Project Angles */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb size={17} className="text-brand-600" />
                  <CardTitle>Best Fit Project Angles</CardTitle>
                </div>
              </CardHeader>
              <ul className="space-y-3">
                {report.projectAngles.map((angle, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{angle.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{angle.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Do Not Chase */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <XCircle size={17} className="text-red-500" />
                  <CardTitle>Do Not Chase</CardTitle>
                </div>
              </CardHeader>
              <ul className="space-y-2.5">
                {report.doNotChase.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <XCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
                    <p className="text-sm text-gray-700">{item}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* ── Disqualifier Warnings ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert size={17} className="text-amber-500" />
                <CardTitle>Disqualifier Watch List</CardTitle>
              </div>
              <button
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                onClick={() => setExpandedDisqualifiers((v) => !v)}
              >
                {expandedDisqualifiers
                  ? <>Hide <ChevronUp size={13} /></>
                  : <>Show all {report.disqualifierWarnings.length} <ChevronDown size={13} /></>
                }
              </button>
            </CardHeader>
            <p className="text-xs text-gray-500 -mt-2 mb-4">
              {report.disqualifierIntro}
            </p>
            <div className="space-y-3">
              {(expandedDisqualifiers
                ? report.disqualifierWarnings
                : report.disqualifierWarnings.slice(0, 3)
              ).map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-3 px-3 rounded-md bg-amber-50 border border-amber-100"
                >
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{w.type}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{w.description}</p>
                    <p className="text-xs text-amber-700 mt-1 font-medium">
                      ⚡ {w.avoidance}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      )}

      {/* ── Empty state (before running) ─────────────────────────────────── */}
      {!report && !running && (
        <div className="text-center py-16 text-gray-400">
          <Radar size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium text-gray-500">
            Click &ldquo;Run Funding Scout&rdquo; to generate your funding strategy
          </p>
          <p className="text-xs mt-1 text-gray-400">
            Results are based on your organization profile — no fabricated grant data
          </p>
        </div>
      )}
    </div>
  );
}
