/**
 * GrantFlow AI — Grant Context Builder
 *
 * Pure module: no Prisma, no async, no Node.js-only APIs.
 * Safe to import in both server components and client components.
 *
 * Detects organization type and grant type to build safety-aware
 * writing context that prevents overclaims and ensures grant-specific focus.
 */

import type { ComplianceFlag } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OrgGuardrails {
  orgName: string;
  isTwiztedJourneys: boolean;
  /** Drives business vs nonprofit writing guidance in the writer agent */
  profileKind: "nonprofit" | "business" | "generic";
  approvedFramings: string[];
  forbiddenClaims: string[];
  /** Lowercase terms — each entry is checked via case-insensitive includes */
  forbiddenTermChecks: ForbiddenTermCheck[];
  /** Optional lines appended after the forbidden-claims block (org-specific safe substitutes) */
  safeSubstituteLines?: string[];
  placeholderGuidance: string[];
}

export interface ForbiddenTermCheck {
  term: string;           // lowercase phrase to search for
  severity: "error" | "warning" | "info";
  message: string;        // Human-readable explanation
  code: string;
}

export interface GrantSpecificContext {
  isStaffSergeantFox: boolean;
  isVeteranFocused: boolean;
  grantInstructions: string;
  requiredPopulationsBlock: string;
  projectAngle: string;
}

// ── Organization detection ──────────────────────────────────────────────────────

export function detectTwiztedJourneys(orgName: string): boolean {
  const lower = orgName.toLowerCase();
  return lower.includes("twizted");
}

function buildTwiztedGuardrails(orgName: string): OrgGuardrails {
  return {
    orgName,
    isTwiztedJourneys: true,
    profileKind: "nonprofit",
    approvedFramings: [
      "Community-based nonprofit in Shelbyville, Indiana",
      "Suicide prevention awareness, education, and community outreach",
      "Non-clinical peer and community support",
      "Memorial and survivor support events",
      "QR-code mental health resource access campaigns",
      "Volunteer coordination and community engagement",
      "Resource navigation and referral pathways to professional services",
      "Connection to veterans' services, crisis lines, and mental health community resources",
      "Fundraising and community awareness activities",
      "Youth and family mental health outreach",
    ],
    forbiddenClaims: [
      "therapy or clinical therapy or psychotherapy",
      "clinical treatment, clinical services, or medical treatment",
      "diagnosis or assessment of mental health conditions",
      "licensed counseling (no LCSW, LPC, licensed therapist, psychologist, psychiatrist)",
      "emergency mental health response or crisis intervention services (as a provider)",
      "medication-assisted treatment (MAT), methadone, or suboxone services",
      "hospital services or inpatient/outpatient clinical care",
      "VA medical center services",
      "formal clinical partnerships (unless verified and listed in org profile)",
      "paid licensed clinical staff (unless verified and listed in org profile)",
    ],
    forbiddenTermChecks: [
      { term: "provides therapy",        severity: "error",   code: "CLINICAL_CLAIM", message: 'Overclaim: "provides therapy" — Twizted Journeys is not a clinical provider.' },
      { term: "offer therapy",           severity: "error",   code: "CLINICAL_CLAIM", message: 'Overclaim: "offer therapy" — use awareness, education, or peer support instead.' },
      { term: "clinical therapy",        severity: "error",   code: "CLINICAL_CLAIM", message: '"Clinical therapy" overclaims licensed clinical services.' },
      { term: "clinical treatment",      severity: "error",   code: "CLINICAL_CLAIM", message: '"Clinical treatment" overclaims licensed clinical services.' },
      { term: "medical treatment",       severity: "error",   code: "CLINICAL_CLAIM", message: '"Medical treatment" overclaims medical services.' },
      { term: "diagnose",                severity: "error",   code: "CLINICAL_CLAIM", message: '"Diagnose/diagnosis" overclaims clinical assessment services.' },
      { term: "clinical diagnosis",      severity: "error",   code: "CLINICAL_CLAIM", message: '"Clinical diagnosis" overclaims clinical assessment services.' },
      { term: "licensed therapist",      severity: "error",   code: "STAFF_CLAIM",   message: '"Licensed therapist" — verify this staff credential exists before including.' },
      { term: "licensed counselor",      severity: "error",   code: "STAFF_CLAIM",   message: '"Licensed counselor" — verify this staff credential exists before including.' },
      { term: "licensed mental health",  severity: "error",   code: "STAFF_CLAIM",   message: '"Licensed mental health" staff overclaims unless specifically verified.' },
      { term: "lcsw",                    severity: "error",   code: "STAFF_CLAIM",   message: '"LCSW" credential — verify this staff exists before including.' },
      { term: "lpc",                     severity: "error",   code: "STAFF_CLAIM",   message: '"LPC" credential — verify this staff exists before including.' },
      { term: "psychologist",            severity: "error",   code: "STAFF_CLAIM",   message: '"Psychologist" overclaims licensed clinical staff.' },
      { term: "psychiatrist",            severity: "error",   code: "STAFF_CLAIM",   message: '"Psychiatrist" overclaims licensed clinical staff.' },
      { term: "medication-assisted",     severity: "error",   code: "CLINICAL_CLAIM", message: '"Medication-assisted treatment" — Twizted Journeys does not provide MAT.' },
      { term: "methadone",               severity: "error",   code: "CLINICAL_CLAIM", message: '"Methadone" — Twizted Journeys does not provide medication services.' },
      { term: "inpatient",               severity: "warning", code: "CLINICAL_CLAIM", message: '"Inpatient" services are clinical — clarify this is a referral, not a service Twizted provides.' },
      { term: "mental health professionals", severity: "warning", code: "STAFF_CLAIM", message: '"Mental health professionals" may overclaim licensed staff — use "community volunteers" or "trained community members" unless verified.' },
      { term: "comprehensive support services", severity: "warning", code: "VAGUE_CLAIM", message: '"Comprehensive support services" is overly broad — specify the actual activities (outreach, education, resource navigation, etc.).' },
      { term: "evidence-based treatment", severity: "warning", code: "CLINICAL_TERM",  message: '"Evidence-based treatment" implies clinical services — use "evidence-informed approaches" or "evidence-based outreach strategies" instead.' },
      { term: "trauma-informed care",    severity: "info",    code: "CLINICAL_TERM",  message: '"Trauma-informed care" — clarify this describes an organizational approach/training, not a clinical service offered.' },
      { term: "clinical partner",        severity: "warning", code: "PARTNER_CLAIM",  message: '"Clinical partner" — verify this partnership exists and is documented.' },
      { term: "formal partnership",      severity: "warning", code: "PARTNER_CLAIM",  message: '"Formal partnership" — verify this partnership is documented before including.' },
    ],
    placeholderGuidance: [
      "Staff names or credentials: [PLACEHOLDER: verify staff qualifications with organization]",
      "Number to be served: [PLACEHOLDER: verify projected number of participants with organization]",
      "Dollar amounts (unless in approved budget): [PLACEHOLDER: verify with organization budget]",
      "Partner organizations: [PLACEHOLDER: verify partnerships with organization before claiming]",
      "Past grant awards or recognitions: [PLACEHOLDER: verify grant history with organization]",
      "Statistics and data: [PLACEHOLDER: cite local/state/national source — verify before submitting]",
    ],
  };
}

// ── NoCapsAI LLC (for-profit small business) — its own guardrail set ─────────────
// Kept entirely separate from Twizted Journeys; the two are never merged.

export function detectNoCapsAI(orgName: string): boolean {
  const lower = orgName.toLowerCase();
  return lower.includes("nocaps");
}

function buildNoCapsAIGuardrails(orgName: string): OrgGuardrails {
  return {
    orgName,
    isTwiztedJourneys: false,
    profileKind: "business",
    approvedFramings: [
      "Early-stage Indiana technology services company based in Rushville, Indiana",
      "Practical AI readiness, automation, and workflow tools for small businesses and community organizations",
      "Website systems, QR systems, and content systems for local organizations",
      "Administrative automation and grant-workflow support",
      "Technical service provider, vendor, or implementation partner for nonprofits, schools, and community groups",
      "Serving Indiana first, then the Midwest and national remote services",
      "Hands-on, practical AI implementation for local service businesses, contractors, and small teams",
    ],
    forbiddenClaims: [
      "employees, staff headcount, or a team (NoCapsAI is early-stage — do not claim employees unless verified)",
      "existing customers, a client base, or active users (unless verified)",
      "revenue, sales, or profitability figures",
      "certifications, accreditations, or licenses (unless verified)",
      "SAM.gov registration or active SAM.gov status (unless verified)",
      "a UEI (Unique Entity Identifier), DUNS number, or CAGE code (unless verified)",
      "government contracting status, GSA Schedule, or past federal awards",
      "501(c)(3) or nonprofit status — NoCapsAI is a for-profit LLC",
      "partnerships, affiliations, or letters of support that are not verified",
      "grants or awards received, or recognitions (unless verified)",
    ],
    forbiddenTermChecks: [
      { term: "our employees",         severity: "error",   code: "STAFF_CLAIM",        message: '"Our employees" — NoCapsAI is early-stage; do not claim employees unless verified.' },
      { term: "our team of",           severity: "warning", code: "STAFF_CLAIM",        message: '"Our team of" — verify team size; NoCapsAI has no claimed headcount.' },
      { term: "our staff",             severity: "warning", code: "STAFF_CLAIM",        message: '"Our staff" — verify staffing before claiming employees.' },
      { term: "our customers",         severity: "error",   code: "CUSTOMER_CLAIM",     message: '"Our customers" — do not claim an existing customer base unless verified.' },
      { term: "existing customers",    severity: "error",   code: "CUSTOMER_CLAIM",     message: '"Existing customers" — do not claim a customer base unless verified.' },
      { term: "our clients",           severity: "warning", code: "CUSTOMER_CLAIM",     message: '"Our clients" — verify client work before citing it.' },
      { term: "annual revenue",        severity: "error",   code: "REVENUE_CLAIM",      message: '"Annual revenue" — do not state revenue figures unless verified.' },
      { term: "in revenue",            severity: "warning", code: "REVENUE_CLAIM",      message: '"In revenue" — do not cite revenue unless verified.' },
      { term: "profitable",            severity: "warning", code: "REVENUE_CLAIM",      message: '"Profitable" — do not claim profitability unless verified.' },
      { term: "sam.gov",               severity: "warning", code: "REGISTRATION_CLAIM", message: '"SAM.gov" — verify registration status; use [VERIFY: SAM.gov UEI] rather than asserting it.' },
      { term: "sam registered",        severity: "error",   code: "REGISTRATION_CLAIM", message: '"SAM registered" — do not assert SAM.gov registration unless verified.' },
      { term: "cage code",             severity: "warning", code: "REGISTRATION_CLAIM", message: '"CAGE code" — verify before claiming.' },
      { term: "gsa schedule",          severity: "error",   code: "CONTRACTING_CLAIM",  message: '"GSA Schedule" — NoCapsAI does not hold a GSA Schedule unless verified.' },
      { term: "government contractor", severity: "error",   code: "CONTRACTING_CLAIM",  message: '"Government contractor" — do not claim contracting status unless verified.' },
      { term: "501(c)(3)",             severity: "error",   code: "STATUS_CLAIM",       message: '"501(c)(3)" — NoCapsAI is a for-profit LLC, not a nonprofit.' },
      { term: "nonprofit organization", severity: "warning", code: "STATUS_CLAIM",     message: '"Nonprofit organization" — NoCapsAI is a for-profit LLC; do not describe itself as a nonprofit.' },
    ],
    safeSubstituteLines: [
      'SAFE SUBSTITUTE: Describe capacity as "NoCapsAI LLC is an early-stage Indiana technology services company" rather than claiming employees, customers, or revenue.',
      'SAFE SUBSTITUTE: For registrations, write "[VERIFY: confirm SAM.gov UEI registration status before submission]" rather than asserting NoCapsAI is registered.',
    ],
    placeholderGuidance: [
      "Team / staff: [PLACEHOLDER: confirm whether NoCapsAI has any team members or is solo-operated]",
      "Registrations (SAM.gov UEI, DUNS, CAGE): [VERIFY: confirm registration status before claiming]",
      "Customers / past work: [PLACEHOLDER: confirm any client work or pilots before citing]",
      "Revenue / financials: [PLACEHOLDER: confirm any figures before including]",
      "Partnerships / letters of support: [PLACEHOLDER: verify before claiming]",
      "Certifications / awards: [PLACEHOLDER: verify before claiming]",
    ],
  };
}

export function buildOrgGuardrails(orgName: string): OrgGuardrails {
  if (detectTwiztedJourneys(orgName)) {
    return buildTwiztedGuardrails(orgName);
  }
  if (detectNoCapsAI(orgName)) {
    return buildNoCapsAIGuardrails(orgName);
  }
  // Generic (non-Twizted) org — minimal guardrails
  return {
    orgName,
    isTwiztedJourneys: false,
    profileKind: "generic",
    approvedFramings: [],
    forbiddenClaims: [],
    forbiddenTermChecks: [],
    placeholderGuidance: [
      "Missing information: [PLACEHOLDER: description of what is needed]",
    ],
  };
}
// ── Grant detection ─────────────────────────────────────────────────────────────

export function detectStaffSergeantFox(grantTitle: string, funder: string): boolean {
  const combined = `${grantTitle} ${funder}`.toLowerCase();
  return (
    combined.includes("staff sergeant fox") ||
    combined.includes("ssgt fox") ||
    combined.includes("sgt. fox") ||
    (combined.includes("fox") && combined.includes("veteran") && combined.includes("suicide"))
  );
}

export function detectVeteranFocused(grantTitle: string, funder: string): boolean {
  const combined = `${grantTitle} ${funder}`.toLowerCase();
  return (
    combined.includes("veteran") ||
    combined.includes("military") ||
    combined.includes("service member") ||
    combined.includes("armed forces") ||
    combined.includes("vets ") ||
    combined.includes("active duty") ||
    combined.includes("gold star")
  );
}

const TWIZTED_VETERANS_ANGLE =
  "Twizted Journeys will strengthen veteran-focused suicide prevention outreach through " +
  "non-clinical community education, peer and community connection, survivor and memorial support, " +
  "QR-code resource access, volunteer engagement, and referral/resource navigation for veterans, " +
  "service members, families, and community members in Shelby County and surrounding Indiana communities.";

export function buildGrantSpecificContext(
  grantTitle: string,
  funder: string,
  orgName: string
): GrantSpecificContext {
  const isSSFox = detectStaffSergeantFox(grantTitle, funder);
  const isVeteran = isSSFox || detectVeteranFocused(grantTitle, funder);
  const isTwizted = detectTwiztedJourneys(orgName);

  if (isSSFox && isTwizted) {
    return {
      isStaffSergeantFox: true,
      isVeteranFocused: true,
      grantInstructions:
        "This is the Staff Sergeant Fox Suicide Prevention Grant Program — a federal grant for " +
        "veteran suicide prevention. Every section MUST center veterans, service members, and families. " +
        "Veteran focus is a core requirement, not optional.",
      requiredPopulationsBlock:
        "REQUIRED POPULATIONS — include in every relevant section:\n" +
        "• Veterans and former service members\n" +
        "• Active-duty military personnel and their families\n" +
        "• Suicide loss survivors connected to veteran suicide\n" +
        "• Community members supporting veteran suicide prevention in Indiana",
      projectAngle: TWIZTED_VETERANS_ANGLE,
    };
  }

  if (isSSFox) {
    return {
      isStaffSergeantFox: true,
      isVeteranFocused: true,
      grantInstructions:
        "This is the Staff Sergeant Fox Suicide Prevention Grant Program — a federal grant for " +
        "veteran suicide prevention. Every section MUST center veterans, service members, and families.",
      requiredPopulationsBlock:
        "REQUIRED POPULATIONS:\n" +
        "• Veterans and service members\n" +
        "• Military families\n" +
        "• Veteran suicide loss survivors",
      projectAngle: "",
    };
  }

  if (isVeteran) {
    return {
      isStaffSergeantFox: false,
      isVeteranFocused: true,
      grantInstructions:
        "This grant focuses on veteran and/or military-connected populations. " +
        "Ensure veteran focus is present throughout the application.",
      requiredPopulationsBlock:
        "REQUIRED POPULATIONS:\n" +
        "• Veterans and service members\n" +
        "• Military families\n" +
        "• Veteran suicide loss survivors",
      projectAngle: "",
    };
  }

  return {
    isStaffSergeantFox: false,
    isVeteranFocused: false,
    grantInstructions: "",
    requiredPopulationsBlock: "",
    projectAngle: "",
  };
}

// ── Prompt block builders ───────────────────────────────────────────────────────

export function buildOrgGuardrailsPromptBlock(guardrails: OrgGuardrails): string {
  // Twizted Journeys — preserved exactly (byte-for-byte) so nonprofit behavior is unchanged.
  if (guardrails.isTwiztedJourneys) {
    return [
      "=== APPROVED ORGANIZATION FRAMINGS (use these) ===",
      "ONLY describe this organization using these approved approaches:",
      guardrails.approvedFramings.map((f) => `• ${f}`).join("\n"),
      "",
      "=== FORBIDDEN CLAIMS — DO NOT INCLUDE ANY OF THESE ===",
      "This organization does NOT provide the following. Do not imply or state that it does:",
      guardrails.forbiddenClaims.map((c) => `• ${c}`).join("\n"),
      "SAFE SUBSTITUTE: If the project connects participants to clinical services, write:",
      "  \"Twizted Journeys navigates community members to [type of service] through referral and resource connection.\"",
      "",
      "=== PLACEHOLDER RULES ===",
      "When facts are unknown, use these exact placeholders:",
      guardrails.placeholderGuidance.map((p) => `• ${p}`).join("\n"),
    ].join("\n");
  }

  // Generic renderer for any other org that defines framings or forbidden claims
  // (e.g. NoCapsAI LLC). Orgs with neither (the default generic profile) emit nothing,
  // preserving prior behavior for Riverside and other profiles.
  if (guardrails.approvedFramings.length === 0 && guardrails.forbiddenClaims.length === 0) {
    return "";
  }

  const parts: string[] = [];

  if (guardrails.approvedFramings.length > 0) {
    parts.push(
      "=== APPROVED ORGANIZATION FRAMINGS (use these) ===",
      "ONLY describe this organization using these approved approaches:",
      guardrails.approvedFramings.map((f) => `• ${f}`).join("\n"),
    );
  }

  if (guardrails.forbiddenClaims.length > 0) {
    if (parts.length > 0) parts.push("");
    parts.push(
      "=== FORBIDDEN CLAIMS — DO NOT INCLUDE ANY OF THESE ===",
      "This organization has NOT confirmed the following. Do not imply or state that it does:",
      guardrails.forbiddenClaims.map((c) => `• ${c}`).join("\n"),
    );
    if (guardrails.safeSubstituteLines && guardrails.safeSubstituteLines.length > 0) {
      parts.push(...guardrails.safeSubstituteLines);
    }
  }

  if (guardrails.placeholderGuidance.length > 0) {
    if (parts.length > 0) parts.push("");
    parts.push(
      "=== PLACEHOLDER RULES ===",
      "When facts are unknown, use these exact placeholders:",
      guardrails.placeholderGuidance.map((p) => `• ${p}`).join("\n"),
    );
  }

  return parts.join("\n");
}

export function buildGrantSpecificPromptBlock(grantCtx: GrantSpecificContext): string {
  if (!grantCtx.grantInstructions) return "";

  const lines: string[] = [
    "=== GRANT-SPECIFIC REQUIREMENTS ===",
    grantCtx.grantInstructions,
  ];

  if (grantCtx.requiredPopulationsBlock) {
    lines.push("", grantCtx.requiredPopulationsBlock);
  }

  if (grantCtx.projectAngle) {
    lines.push("", "CORE PROJECT ANGLE — use this throughout the application:");
    lines.push(grantCtx.projectAngle);
  }

  return lines.join("\n");
}

export function buildDateRulesPromptBlock(): string {
  const currentYear = new Date().getFullYear();
  const pastYear1 = currentYear - 1;
  const pastYear2 = currentYear - 2;
  return [
    "=== DATE RULES — STRICTLY ENFORCED ===",
    `The current year is ${currentYear}. The project period begins AFTER award notification.`,
    `NEVER use ${pastYear2}, ${pastYear1}, or any past year as a future objective target date.`,
    "For SMART objectives, use month references:",
    '  "By Month 3 of the project period..." or "By Month 12 of the project period..."',
    "Do NOT fabricate specific calendar dates. Use relative timeframes instead.",
  ].join("\n");
}

// ── Post-generation compliance check ───────────────────────────────────────────

export function runComplianceCheck(
  content: string,
  orgName: string,
  grantTitle: string,
  funder: string
): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];
  const lower = content.toLowerCase();

  const guardrails = buildOrgGuardrails(orgName);
  const grantCtx = buildGrantSpecificContext(grantTitle, funder, orgName);

  // 1. Forbidden term checks
  const seenCodes = new Set<string>();
  for (const check of guardrails.forbiddenTermChecks) {
    if (lower.includes(check.term) && !seenCodes.has(`${check.code}:${check.term}`)) {
      seenCodes.add(`${check.code}:${check.term}`);
      flags.push({
        severity: check.severity,
        code: check.code,
        message: check.message,
      });
    }
  }

  // 2. Veteran focus check (for Staff Sergeant Fox)
  if (grantCtx.isStaffSergeantFox) {
    const hasVeteranFocus =
      lower.includes("veteran") ||
      lower.includes("service member") ||
      lower.includes("military");
    if (!hasVeteranFocus) {
      flags.push({
        severity: "error",
        code: "MISSING_VETERAN_FOCUS",
        message:
          "Staff Sergeant Fox grant requires veteran focus — this section has no mention of veterans or service members.",
      });
    }
  }

  // 3. Past year dates
  const currentYear = new Date().getFullYear();
  const pastYearPattern = new RegExp(`\\b(${currentYear - 2}|${currentYear - 1})\\b`, "g");
  const pastYearMatches = content.match(pastYearPattern);
  if (pastYearMatches) {
    const uniqueYears = pastYearMatches.filter((v, i, a) => a.indexOf(v) === i);
    flags.push({
      severity: "warning",
      code: "PAST_YEAR_DATE",
      message: `Contains past-year dates (${uniqueYears.join(", ")}) — update all SMART objective dates to future project-period references (e.g., "By Month 6 of the project period").`,
    });
  }

  // 4. Unverified specific claims
  const unverifiedChecks: { pattern: RegExp; code: string; message: string }[] = [
    {
      pattern: /\b(has|have|maintains?)\s+(a\s+)?formal\s+(partner|agreement|MOU)/i,
      code: "UNVERIFIED_PARTNER",
      message: "Unverified formal partnership claim — verify this agreement exists before submitting.",
    },
    {
      pattern: /\b\d[\d,]*\s+(veterans?|clients?|participants?|individuals?)\s+(served|reached|helped|supported)\b/i,
      code: "UNVERIFIED_NUMBER",
      message: "Specific number served — verify this figure with the organization before submitting.",
    },
    {
      pattern: /\$[\d,]+\s*(in\s+)?(grant|award|fund|revenue|donation)/i,
      code: "UNVERIFIED_DOLLAR",
      message: "Specific dollar amount cited — verify this figure with the organization before submitting.",
    },
    {
      pattern: /\b(received|awarded|won)\s+(the\s+)?[\w\s]+(grant|award|funding)\b/i,
      code: "UNVERIFIED_AWARD",
      message: "Past grant/award claim — verify this with the organization before submitting.",
    },
  ];

  for (const { pattern, code, message } of unverifiedChecks) {
    if (pattern.test(content)) {
      flags.push({ severity: "warning", code, message });
    }
  }

  return flags;
}