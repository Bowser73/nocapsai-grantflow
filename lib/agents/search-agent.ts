/**
 * GrantFlow AI — Grants.gov Search Agent
 *
 * POSTs to the Grants.gov REST API, parses results, and upserts them into
 * the GrantOpportunity table. Safe to run concurrently with seeded data —
 * deduplication is by externalId (Grants.gov numeric ID).
 *
 * API docs: https://apply07.grants.gov/grantsws/rest/opportunities/search/
 */

import prisma from "@/lib/db/prisma";
import { startAgentRun, completeAgentRun, failAgentRun } from "@/lib/agents/logger";
import type { SearchAgentInput, SearchAgentOutput, GrantOpportunityResult } from "@/types";

// ─── Grants.gov API types ─────────────────────────────────────────────────────

interface GrantsGovHit {
  id: string;
  number?: string;
  title: string;
  agencyName?: string;
  agencyCode?: string;
  openDate?: string;       // "MM/DD/YYYY"
  closeDate?: string;      // "MM/DD/YYYY"
  awardCeiling?: number;
  awardFloor?: number;
  oppStatus?: string;      // "posted" | "forecasted" | "closed"
  synopsis?: string;
  applicantTypes?: string[];
  fundingCategories?: string[];
  fundingInstrumentTypes?: string[];
}

interface GrantsGovResponse {
  hitCount: number;
  oppHits: GrantsGovHit[];
}

// ─── Category code → label ────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  ACA: "Affordable Care Act",
  AG:  "Agriculture",
  AR:  "Arts",
  BC:  "Business & Commerce",
  CD:  "Community Development",
  CP:  "Consumer Protection",
  DPR: "Disaster Prevention & Relief",
  ED:  "Education",
  ELT: "Employment, Labor & Training",
  EN:  "Energy",
  ENV: "Environment",
  FN:  "Food & Nutrition",
  HL:  "Health",
  HO:  "Housing",
  HU:  "Humanities",
  IIJ: "Infrastructure Investment & Jobs",
  IS:  "Information & Statistics",
  ISS: "Income Security & Social Services",
  LJL: "Law, Justice & Legal Services",
  NR:  "Natural Resources",
  OZ:  "Opportunity Zone Benefits",
  RD:  "Regional Development",
  ST:  "Science & Technology",
  T:   "Transportation",
  O:   "Other",
};

const APPLICANT_TYPE_MAP: Record<string, string> = {
  "00": "State governments",
  "01": "County governments",
  "02": "City or township governments",
  "04": "Special district governments",
  "05": "Independent school districts",
  "06": "Public/state-controlled universities",
  "07": "Native American tribal governments",
  "08": "Public/Indian housing authorities",
  "11": "Other native American tribal organizations",
  "12": "Nonprofits with 501(c)(3) status",
  "13": "Nonprofits without 501(c)(3) status",
  "20": "Private institutions of higher education",
  "21": "Individuals",
  "22": "For-profit organizations",
  "23": "Small businesses",
  "25": "Nonprofits",
  "99": "Unrestricted",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseGrantsGovDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  // Format: "MM/DD/YYYY"
  const [month, day, year] = dateStr.split("/").map(Number);
  if (!month || !day || !year) return undefined;
  return new Date(year, month - 1, day);
}

function mapCategory(codes: string[] | undefined): string {
  if (!codes?.length) return "General";
  const label = CATEGORY_MAP[codes[0]];
  return label ?? codes[0];
}

function mapApplicantTypes(codes: string[] | undefined): string[] {
  if (!codes?.length) return [];
  return codes.map((c) => APPLICANT_TYPE_MAP[c] ?? c);
}

function buildSourceUrl(id: string): string {
  return `https://grants.gov/search-grants?id=${id}`;
}

function safeDesc(text: string | undefined): string {
  if (!text) return "See grant listing for details.";
  return text.slice(0, 2000);
}

// ─── Main agent function ──────────────────────────────────────────────────────

export async function runSearchAgent(
  input: SearchAgentInput
): Promise<SearchAgentOutput> {
  const agentRun = await startAgentRun({
    agentType: "SEARCH",
    applicationId: input.applicationId,
    triggeredById: input.triggeredById,
    inputPayload: { query: input.query, filters: input.filters } as never,
  });

  const startTime = Date.now();

  try {
    const apiKey = process.env.GRANTS_GOV_API_KEY;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(apiKey ? { "Grants-Api-Key": apiKey } : {}),
    };

    // Build request body
    const body = {
      keyword: input.query || "nonprofit community",
      oppStatuses: "posted",
      rows: 25,
      sortBy: "openDate|desc",
      ...(input.filters?.awardMin != null
        ? { awardCeilingFrom: input.filters.awardMin }
        : {}),
      ...(input.filters?.awardMax != null
        ? { awardCeilingTo: input.filters.awardMax }
        : {}),
      ...(input.filters?.deadlineBefore != null
        ? {
            closeDateRange: `01/01/2020-${input.filters.deadlineBefore
              .toLocaleDateString("en-US")
              .replace(/\//g, "/")}`,
          }
        : {}),
    };

    const res = await fetch(
      "https://apply07.grants.gov/grantsws/rest/opportunities/search/",
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!res.ok) {
      throw new Error(`Grants.gov API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as GrantsGovResponse;
    const hits = data.oppHits ?? [];

    // ── Upsert each hit into GrantOpportunity ────────────────────────────────
    const results: GrantOpportunityResult[] = [];

    for (const hit of hits) {
      const deadline = parseGrantsGovDate(hit.closeDate);
      const category = mapCategory(hit.fundingCategories);
      const eligibleOrgTypes = mapApplicantTypes(hit.applicantTypes);
      const sourceUrl = buildSourceUrl(hit.id);
      const isActive = hit.oppStatus === "posted" || hit.oppStatus === "forecasted";

      const mapped = {
        title: hit.title,
        funder: hit.agencyName ?? "Federal Agency",
        description: safeDesc(hit.synopsis),
        category,
        focusAreas: hit.fundingCategories ?? [],
        sourceUrl,
        dataQuality: "VERIFIED" as const,
        isActive,
        deadline: deadline ?? null,
        awardMin: hit.awardFloor ?? null,
        awardMax: hit.awardCeiling ?? null,
        externalId: hit.id,
        originSource: "GRANTS_GOV",
        eligibility: eligibleOrgTypes.join(", ") || null,
        lastVerified: new Date(),
      };

      await (prisma.grantOpportunity as unknown as { upsert: (args: unknown) => Promise<unknown> }).upsert({
        where: { externalId: hit.id },
        create: mapped,
        update: {
          title: mapped.title,
          funder: mapped.funder,
          description: mapped.description,
          category: mapped.category,
          deadline: mapped.deadline,
          awardMin: mapped.awardMin,
          awardMax: mapped.awardMax,
          isActive: mapped.isActive,
          lastVerified: mapped.lastVerified,
        },
      });

      results.push({
        id: hit.id,  // Use Grants.gov ID for dedup display
        title: hit.title,
        funder: hit.agencyName ?? "Federal Agency",
        description: safeDesc(hit.synopsis),
        category,
        awardMin: hit.awardFloor,
        awardMax: hit.awardCeiling,
        deadline,
        sourceUrl,
        dataQuality: "VERIFIED",
      });
    }

    const durationMs = Date.now() - startTime;

    await completeAgentRun(agentRun.id, {
      outputPayload: { count: results.length, query: input.query } as never,
      model: "grants-gov-api",
      durationMs,
      totalTokens: 0,
    });

    return {
      opportunities: results,
      totalFound: data.hitCount,
      sourcesQueried: ["grants.gov"],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failAgentRun(agentRun.id, message);
    throw error;
  }
}
