/**
 * GrantFlow AI — Database Seed
 * Creates a demo organization, grant sources, and sample grant opportunities
 * Run: npm run db:seed
 */
import { PrismaClient, OrgType, GrantSourceType, SubmissionMethod, DataQuality } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding GrantFlow AI database...");

  // ── Demo User ──────────────────────────────────────────────────────────────
  const password = await bcrypt.hash("demo1234!", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@grantflow.ai" },
    update: {},
    create: {
      email: "demo@grantflow.ai",
      name: "Demo User",
      passwordHash: password,
      role: "OWNER",
    },
  });
  console.log("✓ Demo user created:", user.email);

  // ── Demo Organization ──────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: "demo-org-001" },
    update: {},
    create: {
      id: "demo-org-001",
      name: "Riverside Recovery Center",
      ein: "12-3456789",
      orgType: OrgType.NONPROFIT_501C3,
      nonprofitStatus: "501(c)(3)",
      missionStatement:
        "Riverside Recovery Center empowers individuals and families affected by substance use disorder through compassionate, evidence-based treatment, peer support, and community reintegration services.",
      visionStatement:
        "A community where every person has access to the support they need to achieve lasting recovery and lead fulfilling lives.",
      programsServices:
        "Outpatient counseling, peer recovery coaching, family support groups, transitional housing assistance, workforce readiness training, and naloxone distribution.",
      geographicArea: "Marion County, Indiana and surrounding counties",
      targetPopulation:
        "Adults and adolescents affected by opioid use disorder and other substance use disorders, with priority for uninsured and underinsured individuals",
      annualBudget: 850000,
      fiscalYearEnd: "December 31",
      hasAudit: true,
      city: "Indianapolis",
      state: "IN",
      zip: "46201",
      phone: "(317) 555-0100",
      email: "info@riversiderecovery.org",
      website: "https://riversiderecovery.org",
      profileCompleteness: 78,
      // createdByUserId keeps Riverside discoverable as a switchable profile even
      // after the demo user's active org is pointed at NoCapsAI below.
      createdByUserId: user.id,
      users: { connect: { id: user.id } },
    },
  });
  console.log("✓ Demo organization created:", org.name);

  // ── NoCapsAI LLC — default workspace (small-business grant scouting + writing) ──
  const existingNoCapsOrg = await prisma.organization.findFirst({
    where: { name: { contains: "nocapsai", mode: "insensitive" } },
    orderBy: [{ profileCompleteness: "desc" }, { updatedAt: "desc" }],
  });

  const nocapsOrg = await prisma.organization.upsert({
    where: { id: existingNoCapsOrg?.id ?? "nocapsai-org-001" },
    update: { createdByUserId: user.id },
    create: {
      id: "nocapsai-org-001",
      name: "NoCapsAI LLC",
      orgType: OrgType.SMALL_BUSINESS,
      stateOfIncorporation: "Indiana",
      missionStatement:
        "NoCapsAI LLC is an early-stage Indiana technology services company that builds practical AI and automation tools for small businesses and community organizations.",
      programsServices:
        "AI readiness, automation, website systems, nonprofit and small-business tech support, grant workflow support, QR systems, content systems, administrative automation, and practical AI implementation for local organizations.",
      geographicArea:
        "Rushville, Rush County, Indiana — serving Indiana first, then the Midwest and national remote services.",
      targetPopulation:
        "Local service businesses, nonprofits, community organizations, contractors, and small teams that need simple, practical tech systems.",
      city: "Rushville",
      state: "IN",
      zip: "46173",
      // Intentionally left null (no unverified claims): ein, annualBudget, contact info,
      // SAM/UEI, certifications, employees, customers, revenue.
      profileCompleteness: 70,
      createdByUserId: user.id,
      users: { connect: { id: user.id } },
    },
  });
  console.log("✓ NoCapsAI organization created:", nocapsOrg.name);

  // Make NoCapsAI the demo login's default/active workspace.
  // Riverside remains as test data and a switchable profile, but not the default.
  await prisma.user.update({
    where: { id: user.id },
    data: { organizationId: nocapsOrg.id },
  });

  // ── Grant Sources ──────────────────────────────────────────────────────────
  const grantsGov = await prisma.grantSource.upsert({
    where: { id: "source-grants-gov" },
    update: {},
    create: {
      id: "source-grants-gov",
      name: "Grants.gov",
      type: GrantSourceType.FEDERAL_GOVERNMENT,
      baseUrl: "https://www.grants.gov",
      description: "Official federal grant listings from all US government agencies",
      isActive: true,
    },
  });

  const samhsa = await prisma.grantSource.upsert({
    where: { id: "source-samhsa" },
    update: {},
    create: {
      id: "source-samhsa",
      name: "SAMHSA",
      type: GrantSourceType.FEDERAL_GOVERNMENT,
      baseUrl: "https://www.samhsa.gov/grants",
      description: "Substance Abuse and Mental Health Services Administration grants",
      isActive: true,
    },
  });

  const indianaDNI = await prisma.grantSource.upsert({
    where: { id: "source-indiana-dni" },
    update: {},
    create: {
      id: "source-indiana-dni",
      name: "Indiana Division of Mental Health and Addiction",
      type: GrantSourceType.STATE_GOVERNMENT,
      baseUrl: "https://www.in.gov/fssa/dmha/grants/",
      description: "Indiana state grants for mental health and addiction services",
      isActive: true,
    },
  });
  console.log("✓ Grant sources created");

  // ── Sample Grant Opportunities ─────────────────────────────────────────────
  const sampleGrants = [
    {
      id: "grant-samhsa-bsas-2025",
      title: "Medication-Assisted Treatment (MAT) Expansion Program",
      funder: "SAMHSA — Substance Abuse and Mental Health Services Administration",
      description:
        "Funding to expand access to FDA-approved medications for opioid use disorder (OUD), including buprenorphine, methadone, and naltrexone, combined with counseling and other support services.",
      category: "Health",
      focusAreas: ["Substance Use Disorder", "Opioid Crisis", "Mental Health", "Recovery Services"],
      eligibility:
        "Eligible applicants include State and local governments, Federally Recognized Indian Tribal Governments, Nonprofits (501(c)(3)), and hospitals. Organization must be located in the United States.",
      orgTypesAllowed: [OrgType.NONPROFIT_501C3, OrgType.GOVERNMENT],
      locationRestriction: "United States",
      awardMin: 250000,
      awardMax: 500000,
      deadline: new Date("2025-09-30"),
      applicationUrl: "https://www.samhsa.gov/grants/grant-announcements/ti-25-001",
      sourceUrl: "https://www.samhsa.gov/grants/grant-announcements/ti-25-001",
      sourceId: samhsa.id,
      submissionMethod: SubmissionMethod.GRANTS_GOV,
      requiredDocuments: ["SF-424", "Project Narrative", "Budget Justification", "Staffing Plan", "Letters of Support"],
      dataQuality: DataQuality.VERIFIED,
      matchScore: 91,
      confidenceScore: 95,
    },
    {
      id: "grant-indiana-recovery-2025",
      title: "Indiana Recovery Works Community Grant",
      funder: "Indiana Family and Social Services Administration — DMHA",
      description:
        "Supports community-based organizations providing peer recovery support services, recovery coaching, and reintegration services for individuals with substance use disorders in Indiana.",
      category: "Health",
      focusAreas: ["Recovery Support", "Peer Services", "Community Reintegration", "Indiana"],
      eligibility:
        "Indiana-based 501(c)(3) nonprofits with at least 2 years of operation and demonstrated experience serving individuals in recovery. Applicants must serve Marion, Lake, Allen, or Vanderburgh county.",
      orgTypesAllowed: [OrgType.NONPROFIT_501C3, OrgType.GOVERNMENT],
      locationRestriction: "Indiana",
      locationStates: ["IN"],
      awardMin: 50000,
      awardMax: 150000,
      deadline: new Date("2025-08-15"),
      applicationUrl: "https://www.in.gov/fssa/dmha/grants/recovery-works/",
      sourceUrl: "https://www.in.gov/fssa/dmha/grants/recovery-works/",
      sourceId: indianaDNI.id,
      submissionMethod: SubmissionMethod.ONLINE_PORTAL,
      requiredDocuments: ["Organizational Budget", "IRS Determination Letter", "Board List", "Program Description", "Logic Model"],
      dataQuality: DataQuality.VERIFIED,
      matchScore: 96,
      confidenceScore: 90,
    },
    {
      id: "grant-cdc-opioid-2025",
      title: "Overdose Data to Action — Community Programs",
      funder: "CDC — Centers for Disease Control and Prevention",
      description:
        "Supports implementation of evidence-based overdose prevention activities including naloxone distribution, syringe services programs, linkage to care, and community education in high-burden jurisdictions.",
      category: "Health",
      focusAreas: ["Overdose Prevention", "Naloxone", "Public Health", "Harm Reduction"],
      eligibility:
        "State, territorial, and local health departments. Nonprofits may apply as sub-recipients through a state health department.",
      orgTypesAllowed: [OrgType.GOVERNMENT, OrgType.NONPROFIT_501C3],
      locationRestriction: "High-overdose-burden jurisdictions",
      awardMin: 100000,
      awardMax: 350000,
      deadline: new Date("2025-10-01"),
      applicationUrl: "https://www.grants.gov/search-results-detail/352941",
      sourceUrl: "https://www.grants.gov/search-results-detail/352941",
      sourceId: grantsGov.id,
      submissionMethod: SubmissionMethod.GRANTS_GOV,
      requiredDocuments: ["Project Abstract", "Full Project Narrative", "Logic Model", "Evaluation Plan", "Budget Detail Worksheet"],
      dataQuality: DataQuality.VERIFIED,
      matchScore: 82,
      confidenceScore: 88,
    },
  ];

  for (const grant of sampleGrants) {
    await prisma.grantOpportunity.upsert({
      where: { id: grant.id },
      update: {},
      create: grant,
    });
  }
  console.log(`✓ ${sampleGrants.length} sample grant opportunities created`);

  console.log("\n✅ Seeding complete!");
  console.log("   Demo login: demo@grantflow.ai / demo1234!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
