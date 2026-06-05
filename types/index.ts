/**
 * GrantFlow AI — Shared TypeScript Types
 * Re-exports Prisma-generated types and adds app-specific interfaces
 */

// Re-export Prisma enums for use throughout the app
export type {
  User,
  Organization,
  OrganizationDocument,
  GrantOpportunity,
  GrantApplication,
  GrantApplicationSection,
  GrantBudget,
  GrantBudgetLineItem,
  GrantTask,
  GrantStatusUpdate,
  GrantSubmission,
  GrantReport,
  AgentRun,
  Notification,
  GrantSource,
  GrantSearchQuery,
} from "@prisma/client";

export {
  UserRole,
  OrgType,
  DocumentType,
  DocumentStatus,
  GrantSourceType,
  DataQuality,
  SubmissionMethod,
  ApplicationStatus,
  AgentType,
  AgentStatus,
  TaskStatus,
  BudgetCategory,
} from "@prisma/client";

// ─── Agent I/O Types ──────────────────────────────────────────────────────────

export interface AgentInput {
  applicationId?: string;
  organizationId: string;
  triggeredById?: string;
}

export interface AgentOutput<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  agentRunId: string;
}

export interface SearchAgentInput extends AgentInput {
  query: string;
  filters?: GrantSearchFilters;
}

export interface SearchAgentOutput {
  opportunities: GrantOpportunityResult[];
  totalFound: number;
  sourcesQueried: string[];
}

export interface EligibilityAgentInput extends AgentInput {
  opportunityId: string;
}

export interface EligibilityAgentOutput {
  score: number;         // 0-100
  isEligible: boolean;
  strongMatches: string[];
  weakMatches: string[];
  disqualifiers: string[];
  explanation: string;
}

export interface WriterAgentInput extends AgentInput {
  sectionType: GrantSectionType;
  opportunityId?: string; // Optional — writer agent loads opportunity via applicationId
  context?: Partial<WriterContext>;
}

// ── Compliance flags (returned by writer agent post-generation check) ─────────
export interface ComplianceFlag {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

export interface WriterAgentOutput {
  content: string;
  wordCount: number;
  placeholders: string[]; // Fields that need user input
  complianceFlags?: ComplianceFlag[]; // Post-generation safety review flags
}

export interface ComplianceAgentInput extends AgentInput {
  opportunityId: string;
}

export interface ComplianceAgentOutput {
  readinessScore: number; // 0-100
  issues: ComplianceIssue[];
  passed: ComplianceCheck[];
}

// ─── Grant Search ─────────────────────────────────────────────────────────────

export interface GrantSearchFilters {
  location?: string;
  states?: string[];
  category?: string;
  awardMin?: number;
  awardMax?: number;
  deadlineBefore?: Date;
  deadlineAfter?: Date;
  submissionMethod?: string;
  orgTypes?: string[];
}

export interface GrantOpportunityResult {
  id: string;
  title: string;
  funder: string;
  description: string;
  category: string;
  awardMin?: number;
  awardMax?: number;
  deadline?: Date;
  applicationUrl?: string;
  sourceUrl: string;           // Required
  matchScore?: number;
  confidenceScore?: number;
  dataQuality: string;
}

// ─── Grant Writer ─────────────────────────────────────────────────────────────

export type GrantSectionType =
  | "executive_summary"
  | "statement_of_need"
  | "organization_background"
  | "project_description"
  | "goals_and_objectives"
  | "target_population"
  | "community_impact"
  | "evaluation_plan"
  | "sustainability_plan"
  | "budget_narrative"
  | "closing_statement";

export const GRANT_SECTION_LABELS: Record<GrantSectionType, string> = {
  executive_summary:      "Executive Summary",
  statement_of_need:      "Statement of Need",
  organization_background: "Organization Background",
  project_description:    "Project Description",
  goals_and_objectives:   "Goals & Objectives",
  target_population:      "Target Population",
  community_impact:       "Community Impact",
  evaluation_plan:        "Evaluation Plan",
  sustainability_plan:    "Sustainability Plan",
  budget_narrative:       "Budget Narrative",
  closing_statement:      "Closing Statement",
};

export const GRANT_SECTION_ORDER: GrantSectionType[] = [
  "executive_summary",
  "statement_of_need",
  "organization_background",
  "project_description",
  "goals_and_objectives",
  "target_population",
  "community_impact",
  "evaluation_plan",
  "sustainability_plan",
  "budget_narrative",
  "closing_statement",
];

export interface WriterContext {
  organizationName: string;
  missionStatement: string;
  programsServices: string;
  targetPopulation: string;
  geographicArea: string;
  annualBudget?: number;
  grantTitle: string;
  funder: string;
  requestedAmount?: number;
  projectTitle?: string;
  projectSummary?: string;
  strategicAngle?: string; // From Strategy Agent
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export interface ComplianceIssue {
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  suggestion?: string;
}

export interface ComplianceCheck {
  field: string;
  label: string;
  passed: boolean;
}

// ─── Submission ───────────────────────────────────────────────────────────────

export interface SubmissionChecklistItem {
  id: string;
  label: string;
  description?: string;
  isRequired: boolean;
  isCompleted: boolean;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  activeGrants: number;
  upcomingDeadlines: number;
  totalPotentialFunding: number;
  grantsByStatus: Record<string, number>;
  alerts: DashboardAlert[];
}

export interface DashboardAlert {
  id: string;
  type: "deadline" | "status_change" | "missing_doc" | "agent_complete";
  title: string;
  message: string;
  href?: string;
  urgency: "high" | "medium" | "low";
  createdAt: Date;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface OrgProfileFormData {
  name: string;
  ein?: string;
  orgType: string;
  nonprofitStatus?: string;
  missionStatement?: string;
  visionStatement?: string;
  programsServices?: string;
  geographicArea?: string;
  targetPopulation?: string;
  website?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  annualBudget?: number;
  fiscalYearEnd?: string;
  hasAudit?: boolean;
  pastGrantsNarrative?: string;
}
