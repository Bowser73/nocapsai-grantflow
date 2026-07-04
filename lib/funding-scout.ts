/**
 * GrantFlow AI — Funding Scout
 *
 * Analyzes the organization profile and generates prioritized grant search
 * strategies. No fabricated grant results — only ranked search strategies,
 * source pointers, and fit analysis derived from the org's own profile data.
 */

// ── Org Profile Subset ────────────────────────────────────────────────────────
// We define our own interface so this module stays client-safe (no prisma runtime import)

export interface OrgProfileSnapshot {
  name: string;
  orgType?: string | null; // OrgType enum string value
  missionStatement?: string | null;
  programsServices?: string | null;
  targetPopulation?: string | null;
  geographicArea?: string | null;
  city?: string | null;
  state?: string | null;
  annualBudget?: number | null;
  profileCompleteness?: number;
  pastGrantsNarrative?: string | null;
}

// ── Output Types ─────────────────────────────────────────────────────────────

export type SourceCategory = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type FundingSourceType =
  | "Direct grant or award program"
  | "Accelerator or pitch competition"
  | "Loan or financing program"
  | "Tax credit or economic incentive"
  | "Technical assistance or advisory organization"
  | "Procurement or contracting opportunity"
  | "Local program search lane"
  | "Economic-development referral source"
  | "Government small-business program source"
  | "Federal live-search source";
export type VerificationLabel =
  | "Live verified opportunity"
  | "Live search available"
  | "Official program source"
  | "Official search source"
  | "Advisory or referral source"
  | "Manual verification required"
  | "No active opportunity found";

export interface SourceBucket {
  id: string;
  name: string;
  category: SourceCategory;
  categoryLabel: string;
  sourceType: FundingSourceType;
  verificationLabel: VerificationLabel;
  url: string;
  description: string;
  recommendedSearchTerms: string[];
  fitReason: string;
  verificationNeeded: boolean;
}

export interface SearchStrategy {
  term: string;
  priority: "high" | "medium" | "low";
  categoryLabel: string;
  suggestedSources: string[];
}

export interface DisqualifierWarning {
  type: string;
  description: string;
  avoidance: string;
}

export interface ProjectAngle {
  title: string;
  description: string;
}

// Dollar-range funding buckets (business profiles only)
export interface FundingBucket {
  id: string;
  number: number;
  name: string;
  amountRange: string;
  purpose: string;
}

export interface FundingScoutReport {
  orgName: string;
  generatedAt: Date;
  profileCompleteness: number;
  searchStrategies: SearchStrategy[];
  sourceBuckets: SourceBucket[];
  projectAngles: ProjectAngle[];
  doNotChase: string[];
  disqualifierWarnings: DisqualifierWarning[];
  disqualifierIntro: string;
  /** Dollar-range funding buckets — populated for business profiles only */
  fundingBuckets?: FundingBucket[];
}

// ── Profile Type Detection ────────────────────────────────────────────────────

function isBusinessProfile(org: OrgProfileSnapshot): boolean {
  const type = (org.orgType ?? "").toUpperCase();
  // Explicit business types
  if (
    type === "SMALL_BUSINESS" ||
    type === "INDIVIDUAL" ||
    type === "OTHER"
  ) {
    // "OTHER" alone is ambiguous — also check name/mission for business signals
    if (type === "SMALL_BUSINESS" || type === "INDIVIDUAL") return true;
  }
  // Fallback: check org name for common business suffixes
  const name = (org.name ?? "").toLowerCase();
  if (
    name.includes(" llc") ||
    name.includes(" inc.") ||
    name.endsWith(" inc") ||
    name.includes(" corp") ||
    name.includes(" co.") ||
    name.includes(" ltd")
  ) {
    // Only treat as business if not a nonprofit type
    const isNonprofitType =
      type.includes("NONPROFIT") ||
      type.includes("COMMUNITY_GROUP") ||
      type.includes("TRIBAL") ||
      type.includes("SCHOOL") ||
      type.includes("EDUCATION") ||
      type.includes("GOVERNMENT");
    if (!isNonprofitType) return true;
  }
  return false;
}

// ── NONPROFIT: Static Source Buckets ─────────────────────────────────────────
// Priority order: A (local) → B (state MH) → C (regional foundations) → D (corporate) → E (federal)

type StaticBucket = Omit<
  SourceBucket,
  "recommendedSearchTerms" | "sourceType" | "verificationLabel"
> &
  Partial<Pick<SourceBucket, "sourceType" | "verificationLabel">>;

const NONPROFIT_STATIC_BUCKETS: StaticBucket[] = [
  {
    id: "shelby-county",
    name: "Shelby County / Local Community Foundation",
    category: "A",
    categoryLabel: "Indiana / Local Sources",
    sourceType: "Direct grant or award program",
    verificationLabel: "Manual verification required",
    url: "https://www.shelbycf.org/",
    description:
      "Shelby County community foundation and local funders. Strong preference for Shelby County-based organizations and initiatives.",
    fitReason:
      "Highest priority for geographically rooted Shelby County nonprofits doing direct community outreach.",
    verificationNeeded: true,
  },
  {
    id: "indiana-fssa-dmha",
    name: "Indiana FSSA / DMHA",
    category: "A",
    categoryLabel: "Indiana / Local Sources",
    sourceType: "Direct grant or award program",
    verificationLabel: "Official program source",
    url: "https://www.in.gov/fssa/dmha/",
    description:
      "Indiana Family and Social Services Administration — Division of Mental Health and Addiction. Funds mental health outreach, prevention, and community programs statewide.",
    fitReason:
      "Primary state funder for mental health awareness, suicide prevention, and community outreach in Indiana.",
    verificationNeeded: true,
  },
  {
    id: "prevention-insights",
    name: "Prevention Insights / Indiana Prevention Funding",
    category: "B",
    categoryLabel: "Indiana Mental Health / Prevention",
    sourceType: "Technical assistance or advisory organization",
    verificationLabel: "Advisory or referral source",
    url: "https://preventioninsights.iu.edu/",
    description:
      "Indiana University Prevention Insights tracks and aggregates prevention-focused funding across Indiana. Updated grant listings, trainings, and resource connections.",
    fitReason:
      "Specifically funds suicide prevention, mental health awareness, and stigma-reduction programs in Indiana.",
    verificationNeeded: true,
  },
  {
    id: "cicf",
    name: "Central Indiana Community Foundation / Indianapolis Foundation",
    category: "C",
    categoryLabel: "Regional Community Foundations",
    sourceType: "Direct grant or award program",
    verificationLabel: "Manual verification required",
    url: "https://www.cicf.org/",
    description:
      "CICF and The Indianapolis Foundation provide community-focused grants across central Indiana. Mental health and wellness are active grantmaking priorities.",
    fitReason:
      "Regional funder with mental health, community resilience, and equity-focused grant tracks.",
    verificationNeeded: true,
  },
  {
    id: "united-way",
    name: "United Way of Central Indiana",
    category: "C",
    categoryLabel: "Regional Community Foundations",
    sourceType: "Direct grant or award program",
    verificationLabel: "Manual verification required",
    url: "https://www.uwci.org/",
    description:
      "United Way of Central Indiana funds health, education, and financial stability. Mental health is a supported priority area with multiple grant programs.",
    fitReason:
      "Funds community mental health and wellness programs aligned with outreach and education missions.",
    verificationNeeded: true,
  },
  {
    id: "kicking-stigma",
    name: "Kicking The Stigma Action Grants",
    category: "D",
    categoryLabel: "Corporate / Private Mental Health Funders",
    sourceType: "Direct grant or award program",
    verificationLabel: "Official program source",
    url: "https://www.kickingthestigma.com/",
    description:
      "Indianapolis Colts Kicking The Stigma initiative provides action grants to organizations working to end mental health stigma.",
    fitReason:
      "Direct match: funds stigma-reduction, mental health awareness, and community outreach programs in Indiana.",
    verificationNeeded: true,
  },
  {
    id: "lilly-endowment",
    name: "Lilly Endowment",
    category: "D",
    categoryLabel: "Corporate / Private Mental Health Funders",
    sourceType: "Direct grant or award program",
    verificationLabel: "Official program source",
    url: "https://lillyendowment.org/",
    description:
      "Lilly Endowment funds Indiana community development, youth programs, and well-being initiatives. One of Indiana's largest private funders.",
    fitReason:
      "Large Indiana-based private funder with community wellbeing, youth, and mental health-adjacent grant tracks.",
    verificationNeeded: true,
  },
  {
    id: "grants-gov",
    name: "Grants.gov (Federal Fallback)",
    category: "E",
    categoryLabel: "Federal Grants.gov Sources",
    sourceType: "Federal live-search source",
    verificationLabel: "Live search available",
    url: "https://grants.gov",
    description:
      "Federal grants database. Includes SAMHSA, CDC, and other mental health-adjacent federal funders. Use Grant Search above to query live.",
    fitReason:
      "Federal fallback — many federal mental health grants require clinical partners or licensed staff, so vet carefully before applying.",
    verificationNeeded: false,
  },
];

// ── BUSINESS: Static Source Buckets ──────────────────────────────────────────
// Priority: A (Indiana/local biz) → B (Indiana tech/AI) → C (regional small biz) → D (corporate/private) → E (SBA/federal small biz) → F (Grants.gov federal)

const BUSINESS_STATIC_BUCKETS: StaticBucket[] = [
  {
    id: "indiana-sbdc",
    name: "Indiana SBDC — Small Business Development Center",
    category: "A",
    categoryLabel: "Indiana / Local Business Sources",
    url: "https://www.isbdc.org/",
    description:
      "Indiana SBDC provides free consulting, training, and connections to local and state funding for Indiana small businesses and startups.",
    fitReason:
      "First stop for any Indiana small business seeking grants, loans, or state-backed funding opportunities.",
    verificationNeeded: true,
  },
  {
    id: "iedc",
    name: "IEDC — Indiana Economic Development Corporation",
    category: "A",
    categoryLabel: "Indiana / Local Business Sources",
    url: "https://iedc.in.gov/",
    description:
      "IEDC manages Indiana's economic development programs including technology growth grants, workforce development funding, and innovation incentives.",
    fitReason:
      "State funder focused on growing Indiana's technology and innovation sectors — directly relevant to AI and software companies.",
    verificationNeeded: true,
  },
  {
    id: "local-econ-dev",
    name: "Rush County / Local Economic Development",
    category: "A",
    categoryLabel: "Indiana / Local Business Sources",
    url: "https://www.in.gov/ocra/",
    description:
      "Local county and city economic development offices, chambers of commerce, utilities, banks, and community foundations near Rushville often run small grants, micro-grants, and technical-assistance programs. Indiana OCRA also supports rural community and small-business funding. Start here for closest-to-home money.",
    fitReason:
      "Closest-to-home funding for a Rushville-based business — small local awards for software, equipment, websites, training, and marketing (Bucket 1).",
    verificationNeeded: true,
  },
  {
    id: "elevate-ventures",
    name: "Elevate Ventures",
    category: "B",
    categoryLabel: "Indiana Tech / AI / Innovation",
    url: "https://www.elevateventures.com/",
    description:
      "Elevate Ventures is Indiana's leading venture development organization, providing grants and investments to high-growth Indiana startups including tech and software companies.",
    fitReason:
      "Strongest match for Indiana-based AI and software startups seeking grant capital to build and scale.",
    verificationNeeded: true,
  },
  {
    id: "techpoint",
    name: "TechPoint",
    category: "B",
    categoryLabel: "Indiana Tech / AI / Innovation",
    url: "https://techpoint.org/",
    description:
      "TechPoint advocates for Indiana's tech sector and connects startups with funding, talent, and partnerships. The TechPoint Foundation supports workforce and education initiatives in Indiana tech.",
    fitReason:
      "Indiana tech ecosystem hub — relevant for AI/software companies seeking funding, visibility, and ecosystem connections.",
    verificationNeeded: true,
  },
  {
    id: "indy-chamber",
    name: "Indy Chamber / Regional Small Business Support",
    category: "C",
    categoryLabel: "Regional Small Business Support",
    url: "https://www.indychamber.com/",
    description:
      "The Indy Chamber and affiliate organizations support central Indiana small businesses with grants, resources, and access to corporate partnerships.",
    fitReason:
      "Regional business support organization connecting Indiana small businesses with funding and growth resources.",
    verificationNeeded: true,
  },
  {
    id: "sba-sbir",
    name: "SBA SBIR / STTR Program",
    category: "E",
    categoryLabel: "SBA / Federal Small Business",
    url: "https://www.sbir.gov/",
    description:
      "The Small Business Innovation Research (SBIR) and Small Business Technology Transfer (STTR) programs provide competitive federal grants to small businesses doing R&D and technology development — including AI.",
    fitReason:
      "Direct match for AI and software companies developing innovative technology. Phase I awards up to $275K, Phase II up to $1.8M.",
    verificationNeeded: false,
  },
  {
    id: "nsf-seed-fund",
    name: "NSF SBIR/STTR — America's Seed Fund",
    category: "E",
    categoryLabel: "SBA / Federal Small Business",
    url: "https://seedfund.nsf.gov/",
    description:
      "The National Science Foundation's SBIR/STTR program (America's Seed Fund) provides non-dilutive R&D funding for startups and small businesses building innovative technology, including AI and software. Begin with a free Project Pitch.",
    fitReason:
      "Strong fit for an AI/software R&D project. Requires SAM.gov/UEI registration — start early; submit a Project Pitch before a full proposal.",
    verificationNeeded: false,
  },
  {
    id: "sba-programs",
    name: "SBA — Small Business Administration Programs",
    category: "E",
    categoryLabel: "SBA / Federal Small Business",
    url: "https://www.sba.gov/",
    description:
      "SBA administers federal small business grants, loans, and programs including HUBZone, 8(a) business development, and underserved community programs.",
    fitReason:
      "Federal small business programs — some grant-based, many loan-based. Relevant for small business capacity building.",
    verificationNeeded: false,
  },
  {
    id: "grants-gov-biz",
    name: "Grants.gov (Federal Fallback)",
    category: "F",
    categoryLabel: "Federal Grants.gov Sources",
    url: "https://grants.gov",
    description:
      "Federal grants database. Use Grant Search above to query live. For-profit companies are eligible for a narrower set of federal grants — focus on technology, workforce, and economic development programs.",
    fitReason:
      "Federal fallback — most grants.gov opportunities are for nonprofits. Focus searches on NSF, DOE, DOD, and economic development agencies for small business eligibility.",
    verificationNeeded: false,
  },
];

// ── NONPROFIT: Disqualifier Rules ─────────────────────────────────────────────

const BUSINESS_REFINED_BUCKETS: StaticBucket[] = [
  {
    id: "local-digital-transformation",
    name: "Rush County / Rural Indiana Digital Transformation",
    category: "A",
    categoryLabel: "Rural Indiana / Digital Transformation",
    sourceType: "Local program search lane",
    verificationLabel: "Manual verification required",
    url: "https://www.in.gov/ocra/",
    description:
      "Local, county, OCRA, chamber, utility, bank, and community foundation programs may support rural small-business websites, software, automation, training, and digital operations. Verify a current program before treating any local organization as a funder.",
    fitReason:
      "Highest-priority lane for a rural Indiana AI/software company: close geography, practical digital transformation, and lower application burden than federal R&D.",
    verificationNeeded: true,
  },
  {
    id: "indiana-sbdc",
    name: "Indiana SBDC - Small Business Development Center",
    category: "A",
    categoryLabel: "Technical Assistance / Referrals",
    sourceType: "Technical assistance or advisory organization",
    verificationLabel: "Advisory or referral source",
    url: "https://www.isbdc.org/",
    description:
      "Indiana SBDC is an advisory and referral source for consulting, training, grant readiness, financing navigation, and introductions. Do not treat it as a direct grant funder unless a specific current SBDC-run program is verified.",
    fitReason:
      "Best first conversation for grant readiness, local referrals, financing options, and validation of Indiana small-business eligibility.",
    verificationNeeded: true,
  },
  {
    id: "iedc-incentives",
    name: "IEDC - Indiana Economic Development Corporation",
    category: "A",
    categoryLabel: "State Incentives / Innovation",
    sourceType: "Tax credit or economic incentive",
    verificationLabel: "Official program source",
    url: "https://iedc.in.gov/",
    description:
      "IEDC is an official source for Indiana economic development programs, incentives, innovation support, and referrals. Confirm whether a current program is an award, tax credit, incentive, loan, or advisory path before saving it as an opportunity.",
    fitReason:
      "Relevant for Indiana software, AI, workforce, and innovation positioning, but each program needs eligibility and open-status verification.",
    verificationNeeded: true,
  },
  {
    id: "elevate-ventures",
    name: "Elevate Ventures",
    category: "B",
    categoryLabel: "Startup Capital / Pitch",
    sourceType: "Accelerator or pitch competition",
    verificationLabel: "Official program source",
    url: "https://www.elevateventures.com/",
    description:
      "Elevate Ventures runs Indiana startup capital, pitch, and entrepreneurial support programs. Verify the specific open program, stage fit, geography, and whether the opportunity is grant, investment, competition, or advisory support.",
    fitReason:
      "Strong fit when GrantFlow AI is positioned as a software product or AI startup rather than general consulting services.",
    verificationNeeded: true,
  },
  {
    id: "techpoint",
    name: "TechPoint",
    category: "B",
    categoryLabel: "Tech Ecosystem / Referrals",
    sourceType: "Technical assistance or advisory organization",
    verificationLabel: "Advisory or referral source",
    url: "https://techpoint.org/",
    description:
      "TechPoint is an Indiana tech ecosystem organization for visibility, talent, events, startup connections, and referrals. Do not label TechPoint as a direct grant funder unless a specific live award or pitch program is verified.",
    fitReason:
      "Useful for ecosystem access, AI/software visibility, pitch referrals, partner discovery, and talent connections.",
    verificationNeeded: true,
  },
  {
    id: "indy-chamber",
    name: "Indy Chamber / Regional Small Business Support",
    category: "C",
    categoryLabel: "Regional Advisory / Financing",
    sourceType: "Technical assistance or advisory organization",
    verificationLabel: "Advisory or referral source",
    url: "https://www.indychamber.com/",
    description:
      "The Indy Chamber and affiliates provide regional small-business support, lending or financing referrals, coaching, and partner connections. Do not treat the chamber itself as a grant funder unless a specific current grant or award program is found.",
    fitReason:
      "Useful for central Indiana referrals, technical assistance, lender connections, and business support programs.",
    verificationNeeded: true,
  },
  {
    id: "government-contracting",
    name: "Indiana / Federal Government Contracting",
    category: "G",
    categoryLabel: "Government Procurement",
    sourceType: "Procurement or contracting opportunity",
    verificationLabel: "Official search source",
    url: "https://www.sam.gov/",
    description:
      "Government contracts and subcontracts can fund AI, automation, software, website, data, and workflow services without needing nonprofit eligibility. Verify registrations, set-asides, NAICS fit, procurement rules, and open solicitations.",
    fitReason:
      "High-priority non-grant lane for an AI/software company serving agencies, nonprofits, schools, and public-sector contractors.",
    verificationNeeded: true,
  },
  {
    id: "nonprofit-vendor",
    name: "Nonprofit Technology Vendor Opportunities",
    category: "D",
    categoryLabel: "Partner / Vendor",
    sourceType: "Procurement or contracting opportunity",
    verificationLabel: "Manual verification required",
    url: "https://www.grants.gov/",
    description:
      "Nonprofit and public grants can still be relevant when a qualifying applicant budgets the company as a vendor, subcontractor, grant-writing partner, automation provider, or technology implementation partner.",
    fitReason:
      "Keeps nonprofit-only grants out of the direct-application lane while preserving legitimate vendor and subcontracting paths.",
    verificationNeeded: true,
  },
  {
    id: "sba-sbir",
    name: "SBA SBIR / STTR Program",
    category: "E",
    categoryLabel: "SBIR / STTR",
    sourceType: "Direct grant or award program",
    verificationLabel: "Official program source",
    url: "https://www.sbir.gov/",
    description:
      "The SBIR/STTR programs provide competitive non-dilutive federal R&D awards to eligible small businesses. This is only a fit when there is real technical research, innovation, commercialization potential, and registration readiness.",
    fitReason:
      "Priority R&D lane for AI workflow automation, software prototypes, and commercialization-backed innovation.",
    verificationNeeded: false,
  },
  {
    id: "nsf-seed-fund",
    name: "NSF SBIR/STTR - America's Seed Fund",
    category: "E",
    categoryLabel: "SBIR / STTR",
    sourceType: "Direct grant or award program",
    verificationLabel: "Official program source",
    url: "https://seedfund.nsf.gov/",
    description:
      "NSF America's Seed Fund supports high-risk, high-impact technical innovation by startups and small businesses. Begin with an official Project Pitch and do not assume eligibility without reviewing the solicitation.",
    fitReason:
      "Strong only when there is a specific AI/software R&D project, prototype plan, research novelty, and commercialization story.",
    verificationNeeded: false,
  },
  {
    id: "sba-programs",
    name: "SBA - Small Business Administration Programs",
    category: "E",
    categoryLabel: "SBA / Financing / Certifications",
    sourceType: "Government small-business program source",
    verificationLabel: "Official program source",
    url: "https://www.sba.gov/",
    description:
      "SBA programs include loans, certifications, contracting support, and some grant-adjacent programs. Many are not direct grants, so classify the specific program before pursuing.",
    fitReason:
      "Useful for financing, contracting readiness, certifications, and small-business support, not as a generic grant source.",
    verificationNeeded: false,
  },
  {
    id: "grants-gov-biz",
    name: "Grants.gov (Federal Fallback)",
    category: "F",
    categoryLabel: "Federal Grants.gov Sources",
    sourceType: "Federal live-search source",
    verificationLabel: "Live search available",
    url: "https://grants.gov",
    description:
      "Federal live-search source. For-profit companies are eligible for a narrower set of grants; use this for SBIR/STTR, technology, workforce, economic-development, procurement-adjacent, and partner/vendor searches.",
    fitReason:
      "Use as a live search source, not as proof that a fundable opportunity exists.",
    verificationNeeded: false,
  },
];

const NONPROFIT_DISQUALIFIERS: DisqualifierWarning[] = [
  {
    type: "Licensed Clinical Treatment",
    description:
      "Grant requires licensed clinical staff to deliver therapy or counseling on-site as a core program component.",
    avoidance:
      "Skip unless your profile lists a licensed clinical partner. Community awareness and education are different from clinical treatment delivery.",
  },
  {
    type: "Medication-Assisted Treatment (MAT)",
    description:
      "Grant funds medication-assisted treatment programs requiring medical staff and prescribing authority.",
    avoidance:
      "Skip without a licensed healthcare or medical partner providing the MAT component.",
  },
  {
    type: "Hospital / Clinic Operation",
    description:
      "Restricted to licensed hospitals, clinics, or healthcare facilities as the lead applicant.",
    avoidance:
      "Do not apply as lead unless your org operates or is affiliated with a licensed healthcare facility.",
  },
  {
    type: "Adaptive Sports Programs",
    description:
      "Restricted to organizations delivering adaptive sports or therapeutic recreation programming.",
    avoidance:
      "Skip unless your org runs adaptive sports or therapeutic recreation as a core service.",
  },
  {
    type: "Law Enforcement-Only",
    description:
      "Restricted to law enforcement agencies, police departments, or first-responder organizations.",
    avoidance:
      "Skip unless your org is a law enforcement entity or the grant allows a community partner to apply with a law enforcement lead.",
  },
  {
    type: "School District-Only Eligibility",
    description:
      "Restricted to accredited K-12 school districts or Local Education Agencies (LEAs) as lead applicants.",
    avoidance:
      "Skip unless the org can apply as a sub-grantee through a school district as lead.",
  },
  {
    type: "Government Agency-Only",
    description:
      "Restricted to government agencies or units of government (municipalities, counties, state agencies).",
    avoidance:
      "Skip without a qualifying government fiscal agent willing to act as lead applicant.",
  },
];

// ── BUSINESS: Disqualifier Rules ──────────────────────────────────────────────

const BUSINESS_DISQUALIFIERS: DisqualifierWarning[] = [
  {
    type: "501(c)(3)-Only Eligibility",
    description:
      "Grant requires the lead applicant to be a 501(c)(3) nonprofit. The active business profile is for-profit.",
    avoidance:
      "Skip as a direct applicant; instead pursue it as a paid technology vendor/partner to a qualifying nonprofit (Bucket 4).",
  },
  {
    type: "Government Agency-Only",
    description:
      "Restricted to government agencies or units of government (city, county, or state).",
    avoidance:
      "Skip as lead. Offer services as a subcontractor/vendor to a government applicant instead.",
  },
  {
    type: "Revenue / Employee / History Threshold",
    description:
      "Requires minimum revenue, employee headcount, or years in business that the company cannot document.",
    avoidance:
      "Skip unless the threshold is clearly met. Do not overstate company size, staffing, or operating history.",
  },
  {
    type: "Loan-Only Funding",
    description:
      "Program provides only a loan (debt), not grant funds.",
    avoidance:
      "Skip unless the loan is clearly useful, low-risk, and affordable for an early-stage company.",
  },
  {
    type: "Sector-Restricted (Ag / Restaurant / Storefront / Manufacturing)",
    description:
      "Limited to agriculture, restaurants, physical storefront buildout, or manufacturing.",
    avoidance:
      "Skip unless there is a strong, direct fit for AI, automation, or software services.",
  },
  {
    type: "Matching Funds Required",
    description:
      "Requires a cash match the company cannot realistically provide.",
    avoidance:
      "Skip unless the match is small, in-kind, or otherwise realistic for an early-stage business.",
  },
  {
    type: "Deadline Too Soon for Registrations",
    description:
      "Deadline is too close to complete required registrations (e.g., SAM.gov UEI) in time.",
    avoidance:
      "Defer to a future cycle and start SAM.gov/UEI registration now so the next deadline is reachable.",
  },
  {
    type: "Pay-to-Apply / Scam / Low-Odds Contest",
    description:
      "Fake grant, pay-to-apply scheme, low-odds contest, or listicle with no official funder source.",
    avoidance:
      "Reject. Only pursue opportunities that have an official funder source URL and clear terms.",
  },
  {
    type: "Academic / University Research Lead",
    description:
      "Research grants that require a university or principal investigator as the lead applicant.",
    avoidance:
      "Skip pure research grants unless partnering with an Indiana university (IU, Purdue) under an STTR structure.",
  },
];

// ── NONPROFIT: Project Angles ─────────────────────────────────────────────────

const NONPROFIT_PROJECT_ANGLES: ProjectAngle[] = [
  {
    title: "Community Mental Health Awareness and Suicide Prevention Outreach",
    description:
      "Community events, campaigns, and programming that raise awareness, reduce stigma, and connect people with mental health resources.",
  },
  {
    title: "Suicide Loss Survivor Support and Memorial Outreach",
    description:
      "Programs specifically serving individuals and families who have lost someone to suicide — grief support, peer connection, and community healing.",
  },
  {
    title: "Youth and Family Mental Health Resource Connection",
    description:
      "Connecting youth and families to existing mental health resources through education, peer programs, and guided outreach.",
  },
  {
    title: "Stigma Reduction and Peer Support Community Events",
    description:
      "Events and programming designed to reduce mental health stigma and build peer support networks across the community.",
  },
  {
    title: "QR-Code Mental Health Resource Access Campaign",
    description:
      "Innovative outreach using printed QR codes to connect community members with mental health resources on-demand — posters, flyers, events.",
  },
  {
    title: "Volunteer and Community Education Program",
    description:
      "Training community volunteers to recognize signs of mental health crisis, reduce stigma, and connect people with the right support.",
  },
];

// ── BUSINESS: Project Angles ──────────────────────────────────────────────────

const BUSINESS_PROJECT_ANGLES: ProjectAngle[] = [
  {
    title: "AI Readiness & Clarity Hub for small businesses",
    description:
      "A guided assessment and starter toolkit that helps small businesses understand where AI and automation can save time and money.",
  },
  {
    title: "Local Business Automation Starter Kit",
    description:
      "A practical package of automations (scheduling, intake, follow-up, reporting) tailored to local service businesses.",
  },
  {
    title: "Nonprofit Website + QR + Intake Automation System",
    description:
      "A website refresh paired with QR-based access and automated intake/forms for nonprofits and community organizations.",
  },
  {
    title: "GrantFlow AI small-organization grant assistant",
    description:
      "Tooling that helps small organizations find, evaluate, and draft grant applications using verified official sources.",
  },
  {
    title: "Community Tech Support and Digital Operations Toolkit",
    description:
      "Ongoing technical support and digital operations setup for small teams that lack in-house IT.",
  },
  {
    title: "AI workflow training for small organizations",
    description:
      "Hands-on training that helps staff and owners adopt AI and automation tools safely and effectively.",
  },
  {
    title: "Website rescue and automation package for nonprofits",
    description:
      "Rebuilding or rescuing outdated nonprofit websites and layering in automation for intake and communications.",
  },
  {
    title: "Practical AI adoption for rural Indiana businesses",
    description:
      "Accessible, low-cost AI and automation adoption for underserved rural Indiana businesses and organizations.",
  },
];

// ── BUSINESS: Funding buckets (dollar-range strategy) ──────────────────────────
export const BUSINESS_FUNDING_BUCKETS: FundingBucket[] = [
  {
    id: "bucket-1-quick-local",
    number: 1,
    name: "Quick local money",
    amountRange: "$500–$10,000",
    purpose:
      "Software, equipment, website improvements, training, marketing, business setup, and local growth.",
  },
  {
    id: "bucket-2-technical-assistance",
    number: 2,
    name: "Technical assistance",
    amountRange: "$5,000–$25,000",
    purpose:
      "Expert services, technical implementation, automation systems, product development, cybersecurity, compliance, and process improvement.",
  },
  {
    id: "bucket-3-rd",
    number: 3,
    name: "Serious R&D grants",
    amountRange: "$50,000–$300,000+",
    purpose:
      "SBIR/STTR, AI product development, prototype, proof of concept, research partner, and commercialization plan.",
  },
  {
    id: "bucket-4-partner-vendor",
    number: 4,
    name: "Partner / vendor opportunities",
    amountRange: "Varies",
    purpose:
      "The business helps nonprofits, schools, or community groups write and implement grants as a paid technology partner.",
  },
];

// ── NONPROFIT: Do Not Chase ───────────────────────────────────────────────────

const NONPROFIT_DO_NOT_CHASE: string[] = [
  "Clinical treatment grants — require licensed therapists delivering therapy on-site as primary service",
  "Medication-assisted treatment (MAT) grants — require medical staff and prescribing authority",
  "Hospital grants — restricted to licensed healthcare facilities",
  "Adaptive sports grants — require therapeutic recreation programming as core service",
  "Grants requiring licensed therapists on staff as the primary program deliverers",
  "Government agency-only grants — require a government entity as the lead applicant",
];

// ── BUSINESS: Do Not Chase ────────────────────────────────────────────────────

const BUSINESS_DO_NOT_CHASE: string[] = [
  "Applicant must be a 501(c)(3) — a for-profit business should pursue as a vendor/partner instead",
  "Applicant must be a government agency or unit of government",
  "Requires major existing revenue, employees, or operating history the company cannot document",
  "Loan-only funding — skip unless the loan is clearly useful and low-risk",
  "Restricted to agriculture, restaurants, storefront buildout, or manufacturing — skip unless there is a strong, direct fit",
  "Requires matching funds the company cannot realistically provide",
  "Deadline is too close to complete required registrations (e.g., SAM.gov UEI) in time",
  "Fake grant, pay-to-apply scheme, low-odds contest, or listicle with no official source",
];

function buildBusinessDisqualifiers(org: OrgProfileSnapshot): DisqualifierWarning[] {
  const orgName = org.name || "This company";
  return [
    {
      type: "501(c)(3)-Only Eligibility",
      description:
        `Grant requires the lead applicant to be a 501(c)(3) nonprofit. ${orgName} is being evaluated as a for-profit company.`,
      avoidance:
        "Skip as a direct applicant; instead pursue it as a paid technology vendor, subcontractor, or implementation partner to a qualifying nonprofit.",
    },
    {
      type: "Government Agency-Only",
      description:
        "Restricted to government agencies or units of government (city, county, state, public school, or other public entity).",
      avoidance:
        "Skip as lead. Offer services as a subcontractor, vendor, or technology partner to an eligible applicant instead.",
    },
    {
      type: "Academic / University Research Lead",
      description:
        "Research grants that require a university, research institution, principal investigator, or established lab as the lead applicant.",
      avoidance:
        "Skip unless there is a real university or research partner and the opportunity allows a small-business role, such as STTR.",
    },
    {
      type: "Clinical or FDA-Regulated Health",
      description:
        "Clinical care, medical device, FDA-regulated, hospital, or treatment-delivery programs outside the company's verified capabilities.",
      avoidance:
        "Skip unless the company has a qualified clinical, regulatory, or healthcare partner and a clearly eligible non-clinical role.",
    },
    {
      type: "Manufacturing / Hardware-Only",
      description:
        "Limited to manufacturing, equipment production, hardware facilities, storefront buildout, agriculture, or restaurant operations.",
      avoidance:
        "Skip unless the program explicitly supports software, AI, automation, digital operations, or technology services.",
    },
    {
      type: "Revenue / Employee / History Threshold",
      description:
        "Requires minimum revenue, employee headcount, years in business, audited financials, or customer traction the company cannot document.",
      avoidance:
        "Skip unless the threshold is clearly met. Do not overstate company size, staffing, customers, or operating history.",
    },
    {
      type: "Matching Funds Required",
      description:
        "Requires cash match, reimbursement capacity, or documented cost share the company cannot currently prove.",
      avoidance:
        "Skip unless the match is small, in-kind, committed by a partner, or otherwise realistic and documentable.",
    },
    {
      type: "Expired / Archived / Unverified",
      description:
        "Expired program, archived listing, generic listicle, pay-to-apply scheme, or organization page with no current opportunity.",
      avoidance:
        "Reject until an official current source URL confirms open status, applicant eligibility, deadline, and funding terms.",
    },
  ];
}

function buildBusinessDoNotChase(org: OrgProfileSnapshot): string[] {
  const orgName = org.name || "the company";
  return [
    `Nonprofit-only grants without an eligible partner - ${orgName} should not apply directly as a for-profit company`,
    "Academic-only research grants without a university or research partner",
    "Clinical or FDA-regulated health grants",
    "Hardware or manufacturing-only programs without a clear software, AI, or automation fit",
    "Programs requiring an established research laboratory",
    "Grants restricted to government agencies or school districts",
    "Opportunities requiring matching funds the company cannot document",
    "Expired or archived programs",
    "Advisory organizations with no verified live funding program",
  ];
}

// ── Keyword Extraction ────────────────────────────────────────────────────────

interface ExtractedKeywords {
  hasSuicidePrevention: boolean;
  hasMentalHealth: boolean;
  hasGrief: boolean;
  hasPeerSupport: boolean;
  hasStigmaReduction: boolean;
  hasYouth: boolean;
  hasFamily: boolean;
  hasAI: boolean;
  hasTech: boolean;
  hasWorkforce: boolean;
  hasNonprofitSupport: boolean;
  stateLabel: string;
  countyLabel: string | null;
  cityLabel: string | null;
}

function extractKeywords(org: OrgProfileSnapshot): ExtractedKeywords {
  const text = [
    org.missionStatement ?? "",
    org.programsServices ?? "",
    org.targetPopulation ?? "",
    org.pastGrantsNarrative ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const geo = [org.geographicArea ?? "", org.city ?? "", org.state ?? ""]
    .join(" ")
    .toLowerCase();

  const rawState = org.state ?? "Indiana";
  const stateLabel =
    rawState === "IN" || rawState.toLowerCase() === "indiana" ? "Indiana" : rawState;

  const hasShelby =
    geo.includes("shelby") ||
    (org.city ?? "").toLowerCase().includes("shelbyville") ||
    (org.geographicArea ?? "").toLowerCase().includes("shelby");

  return {
    hasSuicidePrevention:
      text.includes("suicide") ||
      text.includes("suicid") ||
      text.includes("suicide prevention"),
    hasMentalHealth:
      text.includes("mental health") ||
      text.includes("behavioral health") ||
      text.includes("mental wellness"),
    hasGrief:
      text.includes("grief") ||
      text.includes("loss survivor") ||
      text.includes("bereavement") ||
      text.includes("loss of "),
    hasPeerSupport:
      text.includes("peer support") ||
      text.includes("peer-to-peer") ||
      text.includes("peer program"),
    hasStigmaReduction:
      text.includes("stigma") ||
      text.includes("destigma") ||
      text.includes("stigma reduction"),
    hasYouth:
      text.includes("youth") ||
      text.includes("teen") ||
      text.includes("adolescent") ||
      text.includes("young people"),
    hasFamily:
      text.includes("family") ||
      text.includes("families") ||
      text.includes("caregiver"),
    hasAI:
      text.includes("artificial intelligence") ||
      text.includes("ai ") ||
      text.includes(" ai") ||
      text.includes("machine learning") ||
      text.includes("automation"),
    hasTech:
      text.includes("software") ||
      text.includes("technology") ||
      text.includes("tech") ||
      text.includes("platform") ||
      text.includes("app ") ||
      text.includes("saas"),
    hasWorkforce:
      text.includes("workforce") ||
      text.includes("job") ||
      text.includes("employment") ||
      text.includes("training"),
    hasNonprofitSupport:
      text.includes("nonprofit") ||
      text.includes("non-profit") ||
      text.includes("501") ||
      text.includes("grant writer"),
    stateLabel,
    countyLabel: hasShelby ? "Shelby County" : null,
    cityLabel:
      org.city && org.city.trim().length > 0 ? org.city.trim() : null,
  };
}

// ── NONPROFIT: Search Strategy Builder ───────────────────────────────────────

function buildNonprofitStrategies(
  org: OrgProfileSnapshot,
  kw: ExtractedKeywords
): SearchStrategy[] {
  const { stateLabel, countyLabel, cityLabel } = kw;
  const strategies: SearchStrategy[] = [];
  if (countyLabel) {
    strategies.push({
      term: `${countyLabel} ${stateLabel} nonprofit grants`,
      priority: "high",
      categoryLabel: "Local",
      suggestedSources: ["Shelby County / Local Community Foundation", "CICF"],
    });
  }

  if (kw.hasSuicidePrevention) {
    strategies.push({
      term: `${stateLabel} suicide prevention nonprofit grants`,
      priority: "high",
      categoryLabel: "Indiana / State",
      suggestedSources: [
        "Indiana FSSA / DMHA",
        "Prevention Insights",
        "Kicking The Stigma",
      ],
    });
    strategies.push({
      term: "suicide loss survivor support grants",
      priority: "high",
      categoryLabel: "Indiana / National",
      suggestedSources: [
        "Prevention Insights",
        "Kicking The Stigma",
        "Grants.gov",
      ],
    });
  }

  if (kw.hasMentalHealth) {
    strategies.push({
      term: `${stateLabel} mental health awareness grants`,
      priority: "high",
      categoryLabel: "Indiana / State",
      suggestedSources: [
        "Indiana FSSA / DMHA",
        "Prevention Insights",
        "CICF",
      ],
    });
    strategies.push({
      term: `community mental health outreach ${stateLabel}`,
      priority: "medium",
      categoryLabel: "Indiana / Regional",
      suggestedSources: ["CICF", "United Way", "Lilly Endowment"],
    });
  }

  if (kw.hasGrief) {
    strategies.push({
      term: `${stateLabel} grief support grants`,
      priority: "high",
      categoryLabel: "Indiana / State",
      suggestedSources: [
        "Indiana FSSA / DMHA",
        "CICF",
        countyLabel ?? "Lilly Endowment",
      ],
    });
  }

  if (kw.hasPeerSupport) {
    strategies.push({
      term: `peer support ${stateLabel} grants`,
      priority: "medium",
      categoryLabel: "Indiana / State",
      suggestedSources: ["Indiana FSSA / DMHA", "Prevention Insights"],
    });
  }

  if (kw.hasStigmaReduction) {
    strategies.push({
      term: "mental health stigma reduction grants",
      priority: "medium",
      categoryLabel: "Corporate / National",
      suggestedSources: ["Kicking The Stigma", "Lilly Endowment"],
    });
  }

  if (kw.hasYouth) {
    strategies.push({
      term: `youth mental health ${stateLabel} grants`,
      priority: "medium",
      categoryLabel: "Indiana / Regional",
      suggestedSources: ["CICF", "Lilly Endowment", "United Way"],
    });
  }

  if (cityLabel) {
    strategies.push({
      term: `${cityLabel} Indiana nonprofit grants`,
      priority: "medium",
      categoryLabel: "Local",
      suggestedSources: [
        "Shelby County / Local Community Foundation",
        "CICF",
      ],
    });
  }

  strategies.push({
    term: `nonprofit community outreach ${stateLabel} grants`,
    priority: "medium",
    categoryLabel: "Indiana / Regional",
    suggestedSources: ["CICF", "United Way", "Lilly Endowment"],
  });

  strategies.push({
    term: `${stateLabel} nonprofit mental health outreach grants`,
    priority: "medium",
    categoryLabel: "Indiana / Regional",
    suggestedSources: ["CICF", "United Way", "Lilly Endowment"],
  });

  if (kw.hasSuicidePrevention || kw.hasMentalHealth) {
    strategies.push({
      term: "SAMHSA suicide prevention community programs",
      priority: "low",
      categoryLabel: "Federal",
      suggestedSources: ["Grants.gov"],
    });
    strategies.push({
      term: "CDC mental health community outreach funding",
      priority: "low",
      categoryLabel: "Federal",
      suggestedSources: ["Grants.gov"],
    });
  }

  const seen = new Set<string>();
  return strategies.filter((s) => {
    if (seen.has(s.term)) return false;
    seen.add(s.term);
    return true;
  });
}

// ── BUSINESS: Search Strategy Builder ────────────────────────────────────────

function buildBusinessStrategies(
  org: OrgProfileSnapshot,
  kw: ExtractedKeywords
): SearchStrategy[] {
  const { stateLabel } = kw;
  const strategies: SearchStrategy[] = [];

  // 1 — Indiana small-business grants
  strategies.push({
    term: `${stateLabel} small business grants`,
    priority: "high",
    categoryLabel: "Indiana / Small Business",
    suggestedSources: ["Indiana SBDC", "IEDC", "Rush County / Local Economic Development"],
  });

  // 2 — Indiana technical assistance programs
  strategies.push({
    term: `${stateLabel} small business technical assistance program`,
    priority: "high",
    categoryLabel: "Indiana / Technical Assistance",
    suggestedSources: ["Indiana SBDC", "IEDC"],
  });

  // 3 — Indiana startup & entrepreneurship programs
  strategies.push({
    term: `${stateLabel} startup and entrepreneurship grants`,
    priority: "high",
    categoryLabel: "Indiana / Startup",
    suggestedSources: ["Elevate Ventures", "Indiana SBDC", "TechPoint"],
  });

  // 4 — IEDC programs
  strategies.push({
    term: "IEDC technology and innovation grant programs",
    priority: "high",
    categoryLabel: "Indiana / IEDC",
    suggestedSources: ["IEDC"],
  });

  // 5 — Indiana SBDC referrals & grant-readiness
  strategies.push({
    term: `${stateLabel} SBDC grant readiness assistance`,
    priority: "medium",
    categoryLabel: "Indiana / SBDC",
    suggestedSources: ["Indiana SBDC"],
  });

  // 6 — SBIR/STTR for AI, automation, edtech, civic/nonprofit tech, productivity, workflow, accessibility
  strategies.push({
    term: "SBIR STTR artificial intelligence automation",
    priority: "high",
    categoryLabel: "SBIR / STTR",
    suggestedSources: ["SBA SBIR / STTR Program", "NSF SBIR/STTR — America's Seed Fund"],
  });
  strategies.push({
    term: "SBIR education technology civic technology accessibility",
    priority: "medium",
    categoryLabel: "SBIR / STTR",
    suggestedSources: ["SBA SBIR / STTR Program", "NSF SBIR/STTR — America's Seed Fund"],
  });

  // 7 — NSF Seed Fund AI & software
  strategies.push({
    term: "NSF SBIR Project Pitch AI software",
    priority: "high",
    categoryLabel: "NSF Seed Fund",
    suggestedSources: ["NSF SBIR/STTR — America's Seed Fund"],
  });

  // 8 — SBA programs (only when truly open to for-profit small businesses)
  strategies.push({
    term: "SBA small business programs for-profit eligible",
    priority: "low",
    categoryLabel: "SBA / Federal Small Business",
    suggestedSources: ["SBA — Small Business Administration Programs"],
  });

  // 9 — Local county/city/chamber/utility/bank/foundation programs
  strategies.push({
    term: "Rush County Rushville Indiana small business grant",
    priority: "medium",
    categoryLabel: "Local",
    suggestedSources: ["Rush County / Local Economic Development", "Indiana SBDC"],
  });
  strategies.push({
    term: "Indiana chamber of commerce small business grant",
    priority: "low",
    categoryLabel: "Local",
    suggestedSources: ["Indy Chamber", "Rush County / Local Economic Development"],
  });

  // 10 — Export, digital growth, workforce, tech adoption, innovation vouchers
  strategies.push({
    term: `${stateLabel} technology adoption innovation voucher grant`,
    priority: "medium",
    categoryLabel: "Tech Adoption / Innovation",
    suggestedSources: ["IEDC", "Indiana SBDC"],
  });
  if (kw.hasWorkforce || kw.hasAI) {
    strategies.push({
      term: `${stateLabel} workforce training technology grant`,
      priority: "medium",
      categoryLabel: "Workforce / Training",
      suggestedSources: ["IEDC", "Indiana SBDC"],
    });
  }
  strategies.push({
    term: `${stateLabel} small business export digital growth grant`,
    priority: "low",
    categoryLabel: "Export / Digital Growth",
    suggestedSources: ["IEDC", "Indiana SBDC"],
  });

  // Partner / vendor angle (Bucket 4) — implement grants for nonprofits/schools
  if (kw.hasNonprofitSupport) {
    strategies.push({
      term: "technology vendor partner for nonprofit grant implementation",
      priority: "medium",
      categoryLabel: "Partner / Vendor",
      suggestedSources: ["Indiana SBDC", "IEDC"],
    });
  }

  // Federal fallback — use the live Grant Search; for-profit-eligible programs only
  strategies.push({
    term: "federal small business technology grants for-profit eligible",
    priority: "low",
    categoryLabel: "Federal",
    suggestedSources: ["Grants.gov (Federal Fallback)"],
  });

  strategies.unshift(
    {
      term: "Indiana rural small business digital transformation funding",
      priority: "high",
      categoryLabel: "Rural Digital Transformation",
      suggestedSources: ["Rush County / Rural Indiana Digital Transformation", "Indiana SBDC", "IEDC"],
    },
    {
      term: "small business technology adoption program Indiana",
      priority: "high",
      categoryLabel: "Technology Adoption",
      suggestedSources: ["Rush County / Rural Indiana Digital Transformation", "IEDC", "Indiana SBDC"],
    },
    {
      term: "rural business automation funding",
      priority: "high",
      categoryLabel: "Rural Automation",
      suggestedSources: ["Rush County / Rural Indiana Digital Transformation", "Indiana SBDC"],
    },
    {
      term: "Indiana AI startup accelerator",
      priority: "high",
      categoryLabel: "Startup / Accelerator",
      suggestedSources: ["Elevate Ventures", "TechPoint"],
    },
    {
      term: "Indiana technology pitch competition",
      priority: "high",
      categoryLabel: "Startup / Pitch",
      suggestedSources: ["Elevate Ventures", "TechPoint"],
    },
    {
      term: "AI workforce development grant Indiana",
      priority: "high",
      categoryLabel: "Workforce / Training",
      suggestedSources: ["IEDC", "Indiana SBDC", "Grants.gov (Federal Fallback)"],
    },
    {
      term: "SBIR artificial intelligence workflow automation",
      priority: "high",
      categoryLabel: "SBIR / STTR",
      suggestedSources: ["SBA SBIR / STTR Program", "NSF SBIR/STTR - America's Seed Fund"],
    },
    {
      term: "government AI automation small business contract",
      priority: "high",
      categoryLabel: "Procurement / Contracting",
      suggestedSources: ["Indiana / Federal Government Contracting"],
    },
    {
      term: "nonprofit technology vendor opportunity",
      priority: "high",
      categoryLabel: "Partner / Vendor",
      suggestedSources: ["Nonprofit Technology Vendor Opportunities", "Grants.gov (Federal Fallback)"],
    },
    {
      term: "Indiana software startup incentive",
      priority: "high",
      categoryLabel: "Innovation Incentives",
      suggestedSources: ["IEDC", "Elevate Ventures"],
    }
  );

  const seen = new Set<string>();
  return strategies.filter((s) => {
    if (seen.has(s.term)) return false;
    seen.add(s.term);
    return true;
  });
}

// ── Source Term Mapping — Nonprofit ──────────────────────────────────────────

function attachNonprofitSearchTerms(
  strategies: SearchStrategy[],
  kw: ExtractedKeywords
): SourceBucket[] {
  const termsFor = (sourceNameIncludes: string[]): string[] =>
    strategies
      .filter((s) =>
        s.suggestedSources.some((src) =>
          sourceNameIncludes.some((name) =>
            src.toLowerCase().includes(name.toLowerCase())
          )
        )
      )
      .map((s) => s.term)
      .slice(0, 3);

  return NONPROFIT_STATIC_BUCKETS.map((bucket): SourceBucket => {
    let terms: string[] = [];

    switch (bucket.id) {
      case "shelby-county":
        terms = termsFor(["Shelby"]);
        if (terms.length === 0)
          terms = [
            `${kw.stateLabel} local community foundation grants`,
            "community mental health outreach grants",
          ];
        break;
      case "indiana-fssa-dmha":
        terms = termsFor(["FSSA", "DMHA"]);
        if (terms.length === 0)
          terms = [
            `${kw.stateLabel} mental health outreach grants`,
            "suicide prevention nonprofit grants",
          ];
        break;
      case "prevention-insights":
        terms = termsFor(["Prevention Insights", "Prevention"]);
        if (terms.length === 0)
          terms = [
            "Indiana suicide prevention grants",
            "mental health awareness Indiana",
          ];
        break;
      case "cicf":
        terms = termsFor(["CICF", "Community Foundation"]);
        if (terms.length === 0)
          terms = [
            "community mental health outreach Indiana",
            "youth mental health Indiana grants",
          ];
        break;
      case "united-way":
        terms = [
          "mental health community outreach Indiana",
          "nonprofit wellness programs Indiana",
        ];
        break;
      case "kicking-stigma":
        terms = [
          "mental health stigma reduction community",
          "suicide prevention awareness outreach",
        ];
        break;
      case "lilly-endowment":
        terms = [
          "Indiana nonprofit community wellbeing",
          "youth mental health Indiana grants",
          "community education mental health",
        ];
        break;
      case "grants-gov":
        terms = strategies
          .filter((s) => s.priority === "low")
          .map((s) => s.term)
          .slice(0, 3);
        if (terms.length === 0) terms = ["SAMHSA mental health community programs"];
        break;
      default:
        terms = ["mental health community outreach"];
    }

    return {
      ...bucket,
      sourceType: bucket.sourceType ?? "Direct grant or award program",
      verificationLabel: bucket.verificationLabel ?? "Manual verification required",
      recommendedSearchTerms: terms,
    };
  });
}

// ── Source Term Mapping — Business ────────────────────────────────────────────

function attachBusinessSearchTerms(
  strategies: SearchStrategy[],
  kw: ExtractedKeywords
): SourceBucket[] {
  const termsFor = (sourceNameIncludes: string[]): string[] =>
    strategies
      .filter((s) =>
        s.suggestedSources.some((src) =>
          sourceNameIncludes.some((name) =>
            src.toLowerCase().includes(name.toLowerCase())
          )
        )
      )
      .map((s) => s.term)
      .slice(0, 3);

  return BUSINESS_REFINED_BUCKETS.map((bucket): SourceBucket => {
    let terms: string[] = [];

    switch (bucket.id) {
      case "indiana-sbdc":
        terms = termsFor(["SBDC"]);
        if (terms.length === 0)
          terms = [
            "Indiana small business technology grants",
            "Indiana small business innovation grants",
          ];
        break;
      case "iedc":
        terms = termsFor(["IEDC"]);
        if (terms.length === 0)
          terms = [
            "IEDC technology company grants Indiana",
            "Indiana economic development tech grants",
          ];
        break;
      case "local-digital-transformation":
        terms = [
          "Indiana rural small business digital transformation funding",
          "small business technology adoption program Indiana",
          "rural business automation funding",
        ];
        break;
      case "iedc-incentives":
        terms = termsFor(["IEDC"]);
        if (terms.length === 0)
          terms = [
            "Indiana software startup incentive",
            "IEDC technology and innovation programs",
            "Indiana innovation incentive software startup",
          ];
        break;
      case "elevate-ventures":
        terms = termsFor(["Elevate"]);
        if (terms.length === 0)
          terms = [
            "Elevate Ventures Indiana tech grant",
            "Indiana AI startup funding",
          ];
        break;
      case "techpoint":
        terms = termsFor(["TechPoint"]);
        if (terms.length === 0)
          terms = [
            "Indiana AI startup accelerator",
            "Indiana technology pitch competition",
            "Indiana software startup ecosystem",
          ];
        break;
      case "orr-fellowship":
        terms = [
          "Indiana software startup talent program",
          "Indiana technology fellowship startup employer",
          "Orr Fellowship startup employer Indiana",
        ];
        break;
      case "indy-chamber":
        terms = [
          "central Indiana small business support",
          "Indianapolis small business financing program",
          "Indiana small business technical assistance",
        ];
        break;
      case "government-contracting":
        terms = [
          "government AI automation small business contract",
          "Indiana software automation procurement",
          "SAM.gov AI workflow automation small business",
        ];
        break;
      case "nonprofit-vendor":
        terms = [
          "nonprofit technology vendor opportunity",
          "nonprofit grant technology implementation partner",
          "grant budget software automation vendor",
        ];
        break;
      case "sba-sbir":
        terms = termsFor(["SBIR", "STTR"]);
        if (terms.length === 0)
          terms = [
            "SBIR artificial intelligence workflow automation",
            "STTR AI software startup grants",
            "NSF SBIR Phase I AI automation",
          ];
        break;
      case "nsf-seed-fund":
        terms = [
          "NSF SBIR Project Pitch artificial intelligence",
          "America's Seed Fund AI software",
          "NSF STTR small business technology",
        ];
        break;
      case "sba-programs":
        terms = [
          "SBA small business grants",
          "federal small business development programs",
        ];
        break;
      case "grants-gov-biz":
        terms = strategies
          .filter((s) => s.priority === "low")
          .map((s) => s.term)
          .slice(0, 3);
        if (terms.length === 0)
          terms = [
            "federal small business technology grants for-profit eligible",
            "AI workforce development grant Indiana",
            "government AI automation small business contract",
          ];
        break;
      default:
        terms = ["small business technology grants"];
    }

    return {
      ...bucket,
      sourceType: bucket.sourceType ?? "Technical assistance or advisory organization",
      verificationLabel: bucket.verificationLabel ?? "Manual verification required",
      recommendedSearchTerms: terms,
    };
  });
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function generateFundingScout(org: OrgProfileSnapshot): FundingScoutReport {
  const kw = extractKeywords(org);
  const isBusiness = isBusinessProfile(org);

  if (isBusiness) {
    const strategies = buildBusinessStrategies(org, kw);
    const sourceBuckets = attachBusinessSearchTerms(strategies, kw);
    return {
      orgName: org.name,
      generatedAt: new Date(),
      profileCompleteness: org.profileCompleteness ?? 0,
      searchStrategies: strategies,
      sourceBuckets,
      projectAngles: BUSINESS_PROJECT_ANGLES,
      doNotChase: buildBusinessDoNotChase(org),
      disqualifierWarnings: buildBusinessDisqualifiers(org),
      disqualifierIntro:
        "Watch for these requirements when reviewing funding opportunities. These are common disqualifiers for a for-profit AI and software company without nonprofit, university, clinical, or manufacturing eligibility.",
      fundingBuckets: BUSINESS_FUNDING_BUCKETS,
    };
  }

  // Nonprofit path (default)
  const strategies = buildNonprofitStrategies(org, kw);
  const sourceBuckets = attachNonprofitSearchTerms(strategies, kw);

  return {
    orgName: org.name,
    generatedAt: new Date(),
    profileCompleteness: org.profileCompleteness ?? 0,
    searchStrategies: strategies,
    sourceBuckets,
    projectAngles: NONPROFIT_PROJECT_ANGLES,
    doNotChase: NONPROFIT_DO_NOT_CHASE,
    disqualifierWarnings: NONPROFIT_DISQUALIFIERS,
    disqualifierIntro:
      "Watch for these requirements when reviewing any grant. These are common disqualifiers for community outreach nonprofits without clinical infrastructure.",
  };
}

// ── Category Metadata ─────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  SourceCategory,
  { label: string; colorClass: string; badgeClass: string }
> = {
  A: {
    label: "A — Indiana / Local",
    colorClass: "text-green-700",
    badgeClass: "bg-green-100 text-green-700",
  },
  B: {
    label: "B — State / Sector-Specific",
    colorClass: "text-teal-700",
    badgeClass: "bg-teal-100 text-teal-700",
  },
  C: {
    label: "C — Regional Foundations / Support",
    colorClass: "text-blue-700",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  D: {
    label: "D — Corporate / Private",
    colorClass: "text-purple-700",
    badgeClass: "bg-purple-100 text-purple-700",
  },
  E: {
    label: "E — Federal Small Business / SBA",
    colorClass: "text-orange-700",
    badgeClass: "bg-orange-100 text-orange-700",
  },
  F: {
    label: "F — Federal Grants.gov (Fallback)",
    colorClass: "text-gray-600",
    badgeClass: "bg-gray-100 text-gray-600",
  },
  G: {
    label: "G - Government procurement",
    colorClass: "text-sky-700",
    badgeClass: "bg-sky-100 text-sky-700",
  },
};
