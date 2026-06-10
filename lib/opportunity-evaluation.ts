/**
 * GrantFlow AI — Opportunity Evaluation (NoCapsAI / small-business profiles)
 *
 * Pure, deterministic, client-safe module (no Prisma, no async, no Node-only APIs).
 *
 * Produces the structured per-opportunity evaluation NoCapsAI asked for — fit score,
 * difficulty, registrations, recommended angle, a first-draft abstract, and the next
 * action — by reasoning ONLY over the data already on the opportunity record plus the
 * organization profile.
 *
 * NO FABRICATION: this module never asserts that a grant is open and never invents
 * deadlines, amounts, links, or eligibility. Unknown facts are returned as null or as
 * explicit [VERIFY: ...] placeholders, and `verificationNeeded` is always true so the
 * UI can require live confirmation before anything is acted on.
 */

import type { OrgProfileSnapshot, FundingBucket } from "@/lib/funding-scout";
import { BUSINESS_FUNDING_BUCKETS } from "@/lib/funding-scout";

// ── Inputs ────────────────────────────────────────────────────────────────────

/** Subset of a GrantOpportunity that the evaluator reasons over. All optional/loose
 *  so it can be built from DB records, live Grants.gov hits, or manual entries. */
export interface OpportunityInput {
  title: string;
  funder: string;
  description?: string | null;
  category?: string | null;
  focusAreas?: string[] | null;
  eligibility?: string | null;
  orgTypesAllowed?: string[] | null; // OrgType enum strings, e.g. "SMALL_BUSINESS"
  locationRestriction?: string | null;
  locationStates?: string[] | null;
  awardMin?: number | null;
  awardMax?: number | null;
  awardTypical?: number | null;
  deadline?: Date | string | null;
  isRolling?: boolean | null;
  applicationUrl?: string | null;
  sourceUrl?: string | null;
  requiredDocuments?: string[] | null;
  submissionMethod?: string | null;
}

// ── Output ──────────────────────────────────────────────────────────────────

export type CanApplyDirectly = "yes" | "likely" | "no" | "unknown";
export type ApplicationDifficulty = 1 | 2 | 3 | 4 | 5;

/** The structured fields NoCapsAI requested for every opportunity. */
export interface OpportunityEvaluation {
  grantName: string;
  funder: string;
  officialLink: string | null;
  deadline: string | null; // ISO date (YYYY-MM-DD) or null — never an invented date
  awardAmount: string | null;
  eligibility: string | null;
  matchRequirement: string;
  canApplyDirectly: CanApplyDirectly;
  couldBeVendorPartner: boolean;
  requiredRegistrations: string[];
  requiredAttachments: string[];
  applicationDifficulty: ApplicationDifficulty;
  fitScore: number; // 1–10
  fitRationale: string;
  recommendedAngle: string;
  firstDraftAbstract: string;
  requiredNextAction: string;
  bucket: FundingBucket | null;
  /** Always true: the system never confirms an opportunity is open without live verification. */
  verificationNeeded: boolean;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function combinedText(opp: OpportunityInput): string {
  return [
    opp.title,
    opp.funder,
    opp.description ?? "",
    opp.eligibility ?? "",
    opp.category ?? "",
    ...(opp.focusAreas ?? []),
    opp.locationRestriction ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function orgTypesText(opp: OpportunityInput): string {
  return (opp.orgTypesAllowed ?? []).join(" ").toUpperCase();
}

function isFederalOpportunity(opp: OpportunityInput, text: string): boolean {
  const method = (opp.submissionMethod ?? "").toUpperCase();
  const url = `${opp.applicationUrl ?? ""} ${opp.sourceUrl ?? ""}`.toLowerCase();
  return (
    method.includes("GRANTS_GOV") ||
    url.includes("grants.gov") ||
    url.includes("sbir.gov") ||
    url.includes("nsf.gov") ||
    /\b(sbir|sttr|nsf|nih|department of|federal|sba|doe|dod|darpa)\b/.test(text)
  );
}

function isSbirLike(text: string): boolean {
  return /\b(sbir|sttr|seed fund|proof of concept|prototype|research and development|r&d)\b/.test(
    text
  );
}

function allowsForProfit(opp: OpportunityInput, text: string): boolean {
  const types = orgTypesText(opp);
  if (types.includes("SMALL_BUSINESS") || types.includes("FOR_PROFIT")) return true;
  return /\b(small business|for-profit|for profit|sbir|sttr|startup|business of any)\b/.test(
    text
  );
}

function isNonprofitOnly(opp: OpportunityInput, text: string): boolean {
  const types = orgTypesText(opp);
  const onlyNonprofitTypes =
    types.length > 0 &&
    !types.includes("SMALL_BUSINESS") &&
    !types.includes("FOR_PROFIT") &&
    (types.includes("NONPROFIT") || types.includes("501"));
  const textNonprofitOnly =
    /\b501\(c\)\(3\)\b/.test(text) &&
    /\b(only|must be|required|restricted)\b/.test(text);
  return onlyNonprofitTypes || textNonprofitOnly;
}

function isGovernmentOnly(opp: OpportunityInput, text: string): boolean {
  const types = orgTypesText(opp);
  const onlyGovTypes =
    types.length > 0 &&
    types.includes("GOVERNMENT") &&
    !types.includes("SMALL_BUSINESS") &&
    !types.includes("NONPROFIT") &&
    !types.includes("FOR_PROFIT");
  const textGovOnly =
    /\b(unit of government|government agenc|municipalit|local government)\b/.test(text) &&
    /\b(only|must be|required|lead applicant)\b/.test(text);
  return onlyGovTypes || textGovOnly;
}

function mentionsServedSectors(text: string): boolean {
  return /\b(nonprofit|non-profit|school|district|community|municipal|county|library|church)\b/.test(
    text
  );
}

function toIsoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function formatAward(opp: OpportunityInput): string | null {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  const { awardMin, awardMax, awardTypical } = opp;
  if (awardMin != null && awardMax != null) return `${fmt(awardMin)}–${fmt(awardMax)}`;
  if (awardMax != null) return `Up to ${fmt(awardMax)}`;
  if (awardTypical != null) return `~${fmt(awardTypical)}`;
  if (awardMin != null) return `${fmt(awardMin)}+`;
  return null;
}

function representativeAmount(opp: OpportunityInput): number | null {
  return opp.awardTypical ?? opp.awardMax ?? opp.awardMin ?? null;
}

function bucketByNumber(n: 1 | 2 | 3 | 4): FundingBucket | null {
  return BUSINESS_FUNDING_BUCKETS.find((b) => b.number === n) ?? null;
}

function assignBucket(
  opp: OpportunityInput,
  text: string,
  canApply: CanApplyDirectly,
  vendorPartner: boolean
): FundingBucket | null {
  // If NoCapsAI can't apply directly but can serve as a paid implementer → partner/vendor.
  if (canApply === "no" && vendorPartner) return bucketByNumber(4);

  const amount = representativeAmount(opp);
  if (amount != null) {
    if (amount <= 10_000) return bucketByNumber(1);
    if (amount <= 25_000) return bucketByNumber(2);
    return bucketByNumber(3);
  }
  // Unknown amount — infer from intent.
  if (isSbirLike(text)) return bucketByNumber(3);
  if (/\b(technical assistance|implementation|cybersecurity|process improvement)\b/.test(text))
    return bucketByNumber(2);
  return null;
}

const ANGLE_TITLES = {
  clarityHub: "AI Readiness & Clarity Hub for small businesses",
  automationKit: "Local Business Automation Starter Kit",
  nonprofitSystem: "Nonprofit Website + QR + Intake Automation System",
  grantAssistant: "GrantFlow AI small-organization grant assistant",
  techSupport: "Community Tech Support and Digital Operations Toolkit",
  training: "AI workflow training for small organizations",
  websiteRescue: "Website rescue and automation package for nonprofits",
  ruralAdoption: "Practical AI adoption for rural Indiana businesses",
} as const;

function pickAngle(
  text: string,
  bucket: FundingBucket | null,
  vendorPartner: boolean
): string {
  if (vendorPartner || /\bnonprofit|non-profit|school|district\b/.test(text)) {
    if (/\bwebsite|web site|web\b/.test(text)) return ANGLE_TITLES.websiteRescue;
    if (/\bgrant\b/.test(text)) return ANGLE_TITLES.grantAssistant;
    return ANGLE_TITLES.nonprofitSystem;
  }
  if (bucket?.number === 3) return ANGLE_TITLES.clarityHub;
  if (/\btrain|training|workforce|upskill\b/.test(text)) return ANGLE_TITLES.training;
  if (/\brural\b/.test(text)) return ANGLE_TITLES.ruralAdoption;
  if (/\bsupport|operations|managed\b/.test(text)) return ANGLE_TITLES.techSupport;
  if (bucket?.number === 1) return ANGLE_TITLES.automationKit;
  return ANGLE_TITLES.clarityHub;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ── Main evaluator ──────────────────────────────────────────────────────────

export function evaluateOpportunity(
  opp: OpportunityInput,
  org: OrgProfileSnapshot
): OpportunityEvaluation {
  const text = combinedText(opp);
  const federal = isFederalOpportunity(opp, text);
  const sbir = isSbirLike(text);
  const forProfitOk = allowsForProfit(opp, text);
  const nonprofitOnly = isNonprofitOnly(opp, text);
  const govOnly = isGovernmentOnly(opp, text);

  // Can NoCapsAI apply directly?
  let canApplyDirectly: CanApplyDirectly;
  if (forProfitOk) canApplyDirectly = "yes";
  else if (nonprofitOnly || govOnly) canApplyDirectly = "no";
  else if (/\bbusiness\b/.test(text)) canApplyDirectly = "likely";
  else canApplyDirectly = "unknown";

  // Could NoCapsAI instead be a paid vendor/partner?
  const couldBeVendorPartner =
    nonprofitOnly || govOnly || (canApplyDirectly !== "yes" && mentionsServedSectors(text));

  const bucket = assignBucket(opp, text, canApplyDirectly, couldBeVendorPartner);

  // Required registrations (federal opportunities need SAM.gov/UEI).
  const requiredRegistrations: string[] = federal
    ? [
        "SAM.gov registration (active)",
        "UEI (Unique Entity Identifier)",
        "Grants.gov registration",
        ...(sbir ? ["SBA Company Registry (SBIR/STTR)"] : []),
      ]
    : ["[VERIFY: confirm required registrations with the funder]"];

  // Required attachments.
  const requiredAttachments =
    opp.requiredDocuments && opp.requiredDocuments.length > 0
      ? opp.requiredDocuments
      : ["[VERIFY: confirm required attachments with the funder]"];

  // Difficulty (1 easiest → 5 hardest).
  let applicationDifficulty: ApplicationDifficulty;
  if (bucket?.number === 3 || sbir) applicationDifficulty = 5;
  else if (bucket?.number === 2) applicationDifficulty = 3;
  else if (bucket?.number === 1) applicationDifficulty = 2;
  else if (bucket?.number === 4) applicationDifficulty = 3;
  else applicationDifficulty = federal ? 4 : 3;

  // Fit score (1–10), additive then clamped.
  const orgText = [
    org.missionStatement ?? "",
    org.programsServices ?? "",
    org.targetPopulation ?? "",
  ]
    .join(" ")
    .toLowerCase();
  const orgIsTech = /\b(ai|artificial intelligence|automation|software|technology|workflow)\b/.test(
    orgText
  );
  const oppIsTech = /\b(ai|artificial intelligence|automation|software|technology|workflow|digital|data)\b/.test(
    text
  );
  const indianaAligned =
    (opp.locationStates ?? []).includes("IN") ||
    /\bindiana\b/.test(text) ||
    !opp.locationRestriction;
  const loanOnly = /\bloan\b/.test(text) && !/\bgrant\b/.test(text);
  const sectorRestricted =
    /\b(agricult|restaurant|storefront|manufactur|farm)\b/.test(text) && !oppIsTech;

  let fitScore = 5;
  if (orgIsTech && oppIsTech) fitScore += 2;
  if (indianaAligned) fitScore += 1;
  if (forProfitOk) fitScore += 1;
  if (bucket) fitScore += 1;
  if (canApplyDirectly === "no" && couldBeVendorPartner) fitScore -= 3; // vendor route, lower direct fit
  if (canApplyDirectly === "no" && !couldBeVendorPartner) fitScore -= 5;
  if (loanOnly) fitScore -= 2;
  if (sectorRestricted) fitScore -= 2;
  fitScore = clamp(fitScore, 1, 10);

  // Match requirement.
  const matchRequirement = /\bmatch(ing)?\b/.test(text)
    ? "Possible match requirement — [VERIFY: confirm exact match amount and whether in-kind is allowed]"
    : "No match requirement identified (verify with funder)";

  // Recommended angle.
  const recommendedAngle = pickAngle(text, bucket, couldBeVendorPartner);

  const officialLink = opp.applicationUrl ?? opp.sourceUrl ?? null;
  const orgName = org.name || "NoCapsAI LLC";

  // Why it fits / does not.
  const fitBits: string[] = [];
  if (orgIsTech && oppIsTech)
    fitBits.push("aligns with NoCapsAI's AI/automation/software focus");
  if (indianaAligned) fitBits.push("open to Indiana applicants or unrestricted by location");
  if (forProfitOk) fitBits.push("appears open to for-profit small businesses");
  if (bucket) fitBits.push(`maps to Bucket ${bucket.number} (${bucket.name})`);
  const antiBits: string[] = [];
  if (canApplyDirectly === "no")
    antiBits.push(
      couldBeVendorPartner
        ? "NoCapsAI likely cannot apply directly, but can serve as a paid vendor/partner"
        : "eligibility appears closed to NoCapsAI"
    );
  if (loanOnly) antiBits.push("funding looks loan-only");
  if (sectorRestricted) antiBits.push("appears restricted to an unrelated sector");
  const fitRationale =
    (fitBits.length ? `Fits because it ${fitBits.join("; ")}.` : "Limited positive signals from available data.") +
    (antiBits.length ? ` Caution: ${antiBits.join("; ")}.` : "") +
    " Verify eligibility and open status against the official source before acting.";

  // First-draft abstract — templated from approved framing; no invented metrics.
  const firstDraftAbstract =
    `${orgName}, an early-stage Indiana technology services company based in Rushville, requests support ` +
    `from ${opp.funder} to advance "${recommendedAngle}." The project will deliver practical AI, automation, ` +
    `and digital systems for Indiana small businesses and community organizations. NoCapsAI will ` +
    `[PLACEHOLDER: specific scope of work and milestones] and measure success by ` +
    `[PLACEHOLDER: outcome metrics such as systems delivered, time saved, organizations served]. ` +
    `Requested amount: [VERIFY/CONFIRM amount within the program's range]. ` +
    `[VERIFY: confirm this opportunity is currently open and that a for-profit Indiana LLC is eligible before applying.]`;

  // Required next action.
  let requiredNextAction: string;
  if (!officialLink) {
    requiredNextAction =
      "Locate the official funder source URL, then verify the opportunity is open and confirm eligibility for a for-profit LLC.";
  } else if (canApplyDirectly === "no" && couldBeVendorPartner) {
    requiredNextAction =
      `Approach a qualifying nonprofit/government applicant to engage NoCapsAI as a paid technology vendor/partner; confirm terms at ${officialLink}.`;
  } else {
    requiredNextAction =
      `Verify current open status and for-profit eligibility at ${officialLink}` +
      (federal ? ", and begin SAM.gov/UEI registration now if not already complete." : ".");
  }

  return {
    grantName: opp.title,
    funder: opp.funder,
    officialLink,
    deadline: toIsoDate(opp.deadline),
    awardAmount: formatAward(opp),
    eligibility: opp.eligibility ?? null,
    matchRequirement,
    canApplyDirectly,
    couldBeVendorPartner,
    requiredRegistrations,
    requiredAttachments,
    applicationDifficulty,
    fitScore,
    fitRationale,
    recommendedAngle,
    firstDraftAbstract,
    requiredNextAction,
    bucket,
    verificationNeeded: true,
  };
}

// ── Readiness checklist ───────────────────────────────────────────────────────

export type ReadinessStatus = "present" | "missing" | "verify";

export interface ReadinessItem {
  label: string;
  status: ReadinessStatus;
  note: string;
}

export interface ReadinessChecklist {
  items: ReadinessItem[];
  /** Labels of everything not yet satisfied (missing or to-verify) — what to gather first. */
  missing: string[];
}

/**
 * Lists what an early-stage small business has vs. still needs before drafting a full
 * application. Deterministic and conservative: anything not represented in the profile is
 * marked `missing` or `verify` rather than assumed present.
 */
export function buildReadinessChecklist(org: OrgProfileSnapshot): ReadinessChecklist {
  const has = (v?: string | null) => typeof v === "string" && v.trim().length > 0;
  const orgType = (org.orgType ?? "").toUpperCase();
  const nameIsLlc = (org.name ?? "").toLowerCase().includes("llc");

  const items: ReadinessItem[] = [
    {
      label: "Business formation (LLC) confirmed",
      status: orgType === "SMALL_BUSINESS" || nameIsLlc ? "present" : "verify",
      note: "Indiana LLC formation documents / Secretary of State filing.",
    },
    {
      label: "Mission & services described",
      status: has(org.missionStatement) && has(org.programsServices) ? "present" : "missing",
      note: "Clear description of AI/automation/website services offered.",
    },
    {
      label: "Service area / location",
      status: has(org.geographicArea) || has(org.city) || has(org.state) ? "present" : "missing",
      note: "Rushville, Indiana; Indiana-first, then Midwest/national remote.",
    },
    {
      label: "SAM.gov UEI registration",
      status: "verify",
      note: "Required for federal/SBIR/Grants.gov. Start early — registration can take time.",
    },
    {
      label: "DUNS / CAGE code (if required)",
      status: "verify",
      note: "Some federal programs still reference CAGE; confirm per opportunity.",
    },
    {
      label: "Capability statement / one-pager",
      status: "missing",
      note: "Short overview of NoCapsAI's capabilities, differentiators, and contact info.",
    },
    {
      label: "Project budget template",
      status: "missing",
      note: "Reusable budget with categories (services, software, equipment, training).",
    },
    {
      label: "Past performance / case studies",
      status: has(org.pastGrantsNarrative) ? "present" : "missing",
      note: "Pilots or sample projects; mark clearly if none yet — do not invent.",
    },
    {
      label: "Letters of support / partners",
      status: "verify",
      note: "Only include verified partners or letters; never assert unverified partnerships.",
    },
    {
      label: "Founder bio / resume",
      status: "verify",
      note: "Founder background and relevant expertise for the organization-background section.",
    },
  ];

  const missing = items.filter((i) => i.status !== "present").map((i) => i.label);
  return { items, missing };
}
