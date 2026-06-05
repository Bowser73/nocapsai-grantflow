-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'WRITER', 'VIEWER');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('NONPROFIT_501C3', 'NONPROFIT_501C4', 'NONPROFIT_OTHER', 'SMALL_BUSINESS', 'SCHOOL_K12', 'HIGHER_EDUCATION', 'GOVERNMENT', 'TRIBAL', 'COMMUNITY_GROUP', 'INDIVIDUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('IRS_DETERMINATION_LETTER', 'ARTICLES_OF_INCORPORATION', 'BYLAWS', 'FINANCIAL_STATEMENTS', 'AUDIT_REPORT', 'BUDGET', 'BOARD_LIST', 'STAFF_RESUMES', 'ANNUAL_REPORT', 'PROJECT_PLAN', 'LOGIC_MODEL', 'LETTER_OF_SUPPORT', 'PROOF_OF_IMPACT', 'PHOTO_VIDEO', 'FLYER_MARKETING', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'NEEDS_UPDATE');

-- CreateEnum
CREATE TYPE "GrantSourceType" AS ENUM ('FEDERAL_GOVERNMENT', 'STATE_GOVERNMENT', 'LOCAL_GOVERNMENT', 'PRIVATE_FOUNDATION', 'CORPORATE_FOUNDATION', 'COMMUNITY_FOUNDATION', 'INTERNAL');

-- CreateEnum
CREATE TYPE "DataQuality" AS ENUM ('VERIFIED', 'SCRAPED', 'UNCERTAIN', 'USER_ADDED');

-- CreateEnum
CREATE TYPE "SubmissionMethod" AS ENUM ('ONLINE_PORTAL', 'GRANTS_GOV', 'EMAIL', 'PDF_UPLOAD', 'MAIL', 'MANUAL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFTING', 'NEEDS_REVIEW', 'READY_TO_SUBMIT', 'SUBMITTED', 'FOLLOW_UP_NEEDED', 'AWARDED', 'DENIED', 'REPORTING_REQUIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('SEARCH', 'ELIGIBILITY', 'STRATEGY', 'WRITER', 'BUDGET', 'DOCUMENT', 'COMPLIANCE', 'SUBMISSION', 'TRACKING', 'REPORTING');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SNOOZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('PERSONNEL', 'FRINGE_BENEFITS', 'CONSULTANTS', 'CONTRACTED_SERVICES', 'EQUIPMENT', 'SUPPLIES', 'TRAVEL', 'TECHNOLOGY', 'MARKETING', 'INDIRECT_COSTS', 'MATCHING_FUNDS', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'WRITER',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ein" TEXT,
    "orgType" "OrgType" NOT NULL DEFAULT 'NONPROFIT_501C3',
    "nonprofitStatus" TEXT,
    "incorporatedDate" TIMESTAMP(3),
    "stateOfIncorporation" TEXT,
    "missionStatement" TEXT,
    "visionStatement" TEXT,
    "programsServices" TEXT,
    "geographicArea" TEXT,
    "targetPopulation" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "annualBudget" DOUBLE PRECISION,
    "fiscalYearEnd" TEXT,
    "hasAudit" BOOLEAN NOT NULL DEFAULT false,
    "pastGrantsNarrative" TEXT,
    "profileCompleteness" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GrantSourceType" NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastCrawled" TIMESTAMP(3),
    "crawlConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantSearchQuery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rawQuery" TEXT NOT NULL,
    "parsedFilters" JSONB NOT NULL,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "agentRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrantSearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantOpportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "funder" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "focusAreas" TEXT[],
    "eligibility" TEXT,
    "orgTypesAllowed" "OrgType"[],
    "locationRestriction" TEXT,
    "locationStates" TEXT[],
    "awardMin" DOUBLE PRECISION,
    "awardMax" DOUBLE PRECISION,
    "awardTypical" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "isRolling" BOOLEAN NOT NULL DEFAULT false,
    "nextDeadline" TIMESTAMP(3),
    "applicationUrl" TEXT,
    "portalName" TEXT,
    "submissionMethod" "SubmissionMethod" NOT NULL DEFAULT 'ONLINE_PORTAL',
    "requiredDocuments" TEXT[],
    "wordLimits" JSONB,
    "requirements" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceId" TEXT,
    "dataQuality" "DataQuality" NOT NULL DEFAULT 'SCRAPED',
    "lastVerified" TIMESTAMP(3),
    "matchScore" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantApplication" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFTING',
    "projectTitle" TEXT,
    "projectSummary" TEXT,
    "requestedAmount" DOUBLE PRECISION,
    "matchingAmount" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "reportDueDate" TIMESTAMP(3),
    "awardStatus" TEXT,
    "awardAmount" DOUBLE PRECISION,
    "portalUrl" TEXT,
    "portalUsername" TEXT,
    "submissionNotes" TEXT,
    "submissionMethod" "SubmissionMethod",
    "notes" TEXT,
    "internalScore" INTEGER,
    "readinessScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantApplicationSection" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT,
    "wordCount" INTEGER,
    "wordLimit" INTEGER,
    "charLimit" INTEGER,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lastEditedBy" TEXT,
    "versions" JSONB NOT NULL DEFAULT '[]',
    "agentRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantApplicationSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantBudget" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "totalRequested" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMatching" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProject" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "narrativeSummary" TEXT,
    "notes" TEXT,
    "agentRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantBudgetLineItem" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "category" "BudgetCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "isMatching" BOOLEAN NOT NULL DEFAULT false,
    "justification" TEXT,
    "isAllowable" BOOLEAN,
    "flagNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantBudgetLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantTask" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantStatusUpdate" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "note" TEXT,
    "changedBy" TEXT,
    "agentRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrantStatusUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantSubmission" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "method" "SubmissionMethod" NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "confirmationNumber" TEXT,
    "submittedByUserId" TEXT,
    "submittedVia" TEXT,
    "checklistItems" JSONB NOT NULL DEFAULT '[]',
    "isConfirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "agentRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantReport" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "content" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "agentRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrantReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'PENDING',
    "applicationId" TEXT,
    "triggeredById" TEXT,
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "durationMs" INTEGER,
    "inputPayload" JSONB,
    "outputPayload" JSONB,
    "rawPrompt" TEXT,
    "rawResponse" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "applicationId" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GrantOpportunityToGrantSearchQuery" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ApplicationDocuments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "GrantOpportunity_deadline_idx" ON "GrantOpportunity"("deadline");

-- CreateIndex
CREATE INDEX "GrantOpportunity_category_idx" ON "GrantOpportunity"("category");

-- CreateIndex
CREATE INDEX "GrantOpportunity_isActive_idx" ON "GrantOpportunity"("isActive");

-- CreateIndex
CREATE INDEX "GrantApplication_status_idx" ON "GrantApplication"("status");

-- CreateIndex
CREATE INDEX "GrantApplication_deadline_idx" ON "GrantApplication"("deadline");

-- CreateIndex
CREATE INDEX "GrantApplication_organizationId_idx" ON "GrantApplication"("organizationId");

-- CreateIndex
CREATE INDEX "GrantApplicationSection_applicationId_idx" ON "GrantApplicationSection"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "GrantApplicationSection_applicationId_sectionType_key" ON "GrantApplicationSection"("applicationId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "GrantBudget_applicationId_key" ON "GrantBudget"("applicationId");

-- CreateIndex
CREATE INDEX "GrantTask_applicationId_status_idx" ON "GrantTask"("applicationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GrantSubmission_applicationId_key" ON "GrantSubmission"("applicationId");

-- CreateIndex
CREATE INDEX "AgentRun_agentType_status_idx" ON "AgentRun"("agentType", "status");

-- CreateIndex
CREATE INDEX "AgentRun_applicationId_idx" ON "AgentRun"("applicationId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "_GrantOpportunityToGrantSearchQuery_AB_unique" ON "_GrantOpportunityToGrantSearchQuery"("A", "B");

-- CreateIndex
CREATE INDEX "_GrantOpportunityToGrantSearchQuery_B_index" ON "_GrantOpportunityToGrantSearchQuery"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ApplicationDocuments_AB_unique" ON "_ApplicationDocuments"("A", "B");

-- CreateIndex
CREATE INDEX "_ApplicationDocuments_B_index" ON "_ApplicationDocuments"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDocument" ADD CONSTRAINT "OrganizationDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantSearchQuery" ADD CONSTRAINT "GrantSearchQuery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantSearchQuery" ADD CONSTRAINT "GrantSearchQuery_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantOpportunity" ADD CONSTRAINT "GrantOpportunity_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "GrantSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantApplication" ADD CONSTRAINT "GrantApplication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantApplication" ADD CONSTRAINT "GrantApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "GrantOpportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantApplicationSection" ADD CONSTRAINT "GrantApplicationSection_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "GrantApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantApplicationSection" ADD CONSTRAINT "GrantApplicationSection_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantBudget" ADD CONSTRAINT "GrantBudget_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "GrantApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantBudget" ADD CONSTRAINT "GrantBudget_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantBudgetLineItem" ADD CONSTRAINT "GrantBudgetLineItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "GrantBudget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantTask" ADD CONSTRAINT "GrantTask_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "GrantApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantStatusUpdate" ADD CONSTRAINT "GrantStatusUpdate_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "GrantApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantSubmission" ADD CONSTRAINT "GrantSubmission_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "GrantApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantSubmission" ADD CONSTRAINT "GrantSubmission_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantReport" ADD CONSTRAINT "GrantReport_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "GrantApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantReport" ADD CONSTRAINT "GrantReport_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "GrantApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrantOpportunityToGrantSearchQuery" ADD CONSTRAINT "_GrantOpportunityToGrantSearchQuery_A_fkey" FOREIGN KEY ("A") REFERENCES "GrantOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrantOpportunityToGrantSearchQuery" ADD CONSTRAINT "_GrantOpportunityToGrantSearchQuery_B_fkey" FOREIGN KEY ("B") REFERENCES "GrantSearchQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationDocuments" ADD CONSTRAINT "_ApplicationDocuments_A_fkey" FOREIGN KEY ("A") REFERENCES "GrantApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationDocuments" ADD CONSTRAINT "_ApplicationDocuments_B_fkey" FOREIGN KEY ("B") REFERENCES "OrganizationDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
