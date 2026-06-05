"use client";

import { useState } from "react";
import Link from "next/link";
import {
  generateFundingScout,
  type FundingScoutReport,
  type OrgProfileSnapshot,
  type SearchStrategy,
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
  fitReason:  string;
  searchTerm?: string;
}): string {
  const qs = new URLSearchParams();
  qs.set("sourceName",    params.sourceName);
  qs.set("sourceUrl",     params.sourceUrl);
  qs.set("categoryLabel", params.categoryLabel);
  qs.set("fitReason",     params.fitReason);
  if (params.searchTerm) qs.set("searchTerm", params.searchTerm);
  return `/opportunities/new?${qs.toString()}`;
}

export function FundingScoutView({ org }: FundingScoutViewProps) {
  const [report, setReport]                     = useState<FundingScoutReport | null>(null);
  const [running, setRunning]                   = useState(false);
  const [expandedSources, setExpandedSources]   = useState<Set<string>>(new Set());
  const [expandedDisqualifiers, setExpandedDisqualifiers] = useState(false);

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
                Ranked Funding Sources
              </h3>
              <span className="text-xs text-gray-400">(A = highest priority)</span>
            </div>
            <div className="space-y-3">
              {report.sourceBuckets.map((bucket) => {
                const meta = CATEGORY_META[bucket.category];
                const isExpanded = expandedSources.has(bucket.id);
                const newOpportunityUrl = buildNewOpportunityUrl({
                  sourceName:    bucket.name,
                  sourceUrl:     bucket.url,
                  categoryLabel: meta.label,
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
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {bucket.verificationNeeded ? (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <AlertTriangle size={10} />
                            Manual verification needed
                          </span>
                        ) : (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                            <CheckCircle2 size={10} />
                            Live search available
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
                              programmatically searched yet. Visit the source URL, use the recommended
                              search terms above, and verify eligibility directly before saving.
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

                          <Link href={newOpportunityUrl}>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<PlusCircle size={14} />}
                            >
                              Add Verified Opportunity
                            </Button>
                          </Link>
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
              Watch for these requirements when reviewing any grant. These are common
              disqualifiers for community outreach nonprofits without clinical infrastructure.
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
