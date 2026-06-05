/**
 * GrantFlow AI — Grant Writer Agent
 *
 * Safety guarantees enforced every run:
 * - Organization-specific guardrails (Twizted Journeys safe framings + forbidden claims)
 * - Grant-specific required focus (veteran focus for Staff Sergeant Fox)
 * - Date rules blocking past-year objective dates
 * - Placeholder rules for unverified facts
 * - Post-generation compliance check returning flags to caller
 *
 * Other rules:
 * - Does NOT make up facts — missing info becomes [PLACEHOLDER: ...]
 * - Always logs AgentRun for audit
 * - Saves section with version history
 */

import { generateText } from "@/lib/llm/provider";
import { startAgentRun, completeAgentRun, failAgentRun } from "@/lib/agents/logger";
import prisma from "@/lib/db/prisma";
import {
  buildOrgGuardrails,
  buildGrantSpecificContext,
  buildOrgGuardrailsPromptBlock,
  buildGrantSpecificPromptBlock,
  buildDateRulesPromptBlock,
  runComplianceCheck,
} from "@/lib/agents/grant-context";
import type { WriterAgentInput, WriterAgentOutput, GrantSectionType, WriterContext } from "@/types";
import { GRANT_SECTION_ORDER, GRANT_SECTION_LABELS } from "@/types";

// ── Section guides ──────────────────────────────────────────────────────────────

const SECTION_GUIDES: Record<GrantSectionType, string> = {
  executive_summary:
    "EXECUTIVE SUMMARY\n" +
    "2-paragraph overview: who the org is, what this grant funds, amount requested, " +
    "who benefits and how many (placeholder if unknown), key measurable outcomes. " +
    "For veteran-focused grants: lead with veterans and the crisis of veteran suicide. First impression — every sentence counts.",

  statement_of_need:
    "STATEMENT OF NEED\n" +
    "Document the problem with data. For veteran grants: cite veteran suicide rates " +
    "(national, state, Indiana if available — use [PLACEHOLDER: cite source] if unknown). " +
    "Explain urgency. Connect to funder priorities. End with: why this org, why now, why this approach.",

  organization_background:
    "ORGANIZATION BACKGROUND\n" +
    "History, founding mission, structure, key programs, track record, community trust. " +
    "For veteran-focused grants: describe veteran-connected work, Tonya's background with veterans, " +
    "community relationships with veteran families. " +
    "Use [PLACEHOLDER] for unconfirmed staff credentials, awards, or partnerships.",

  project_description:
    "PROJECT DESCRIPTION\n" +
    "What activities, by whom, when, where. For Twizted Journeys: community education events, " +
    "awareness campaigns, peer/community outreach, QR-code resource access, volunteer engagement, " +
    "survivor/memorial support, resource navigation — NOT clinical services. " +
    "Use Month 1 / Month 6 / Month 12 timeframes.",

  goals_and_objectives:
    "GOALS AND OBJECTIVES\n" +
    "2-3 goals with 3-5 SMART objectives each. Format: " +
    "\"By Month X of the project period, [action] resulting in [measurable outcome].\" " +
    "NEVER use past calendar years. Numbers as [PLACEHOLDER] if unknown. " +
    "For veteran grants: at least one goal must address veteran-specific outreach.",

  target_population:
    "TARGET POPULATION\n" +
    "Who will be served. For veteran grants: lead with veterans, service members, families, " +
    "and suicide loss survivors. Indiana geographic context (Shelby County and surrounding area). " +
    "How org reaches this population: events, partnerships, QR access, outreach. " +
    "Use [PLACEHOLDER: verify number served] for participant counts.",

  community_impact:
    "COMMUNITY IMPACT\n" +
    "Short-term outputs: events, people reached, resources distributed. " +
    "Long-term outcomes: increased awareness, reduced stigma, stronger resource connections, community resilience. " +
    "For veteran grants: impact on veteran families and survivors.",

  evaluation_plan:
    "EVALUATION PLAN\n" +
    "How success is measured. Event attendance counts, pre/post awareness surveys, " +
    "resource materials distributed, follow-up contacts. " +
    "Realistic for a community nonprofit — no clinical data systems. " +
    "How results are reported and used for improvement.",

  sustainability_plan:
    "SUSTAINABILITY PLAN\n" +
    "How the project continues after grant period. Other funding pursued, donations, " +
    "volunteer sustainability, cost-reducing partnerships, capacity-building. " +
    "Be specific. Use [PLACEHOLDER: list other funding sources] if not provided.",

  budget_narrative:
    "BUDGET NARRATIVE\n" +
    "Justify each category. Personnel: roles and why essential " +
    "([PLACEHOLDER: verify staff positions and FTE]). " +
    "Events/outreach: venue, materials, printing, supplies. " +
    "Matching/leveraged funds if applicable ([PLACEHOLDER: list matching sources if any]). " +
    "NEVER make up dollar amounts — use placeholders for unverified figures.",

  closing_statement:
    "CLOSING STATEMENT\n" +
    "1-2 paragraph conclusion: urgency of need (veteran crisis), org's unique community position " +
    "and authentic connection to affected families, impact of funder's investment, " +
    "sincere confident call to fund. Human and mission-driven — not corporate boilerplate.",
};
// ── Prompt builder ──────────────────────────────────────────────────────────────

function buildSectionPrompt(sectionType: GrantSectionType, ctx: WriterContext): string {
  const guardrails = buildOrgGuardrails(ctx.organizationName);
  const grantCtx = buildGrantSpecificContext(ctx.grantTitle, ctx.funder, ctx.organizationName);
  const guardrailsBlock = buildOrgGuardrailsPromptBlock(guardrails);
  const grantSpecificBlock = buildGrantSpecificPromptBlock(grantCtx);
  const dateRulesBlock = buildDateRulesPromptBlock();
  const projectAngle = grantCtx.projectAngle || ctx.strategicAngle;

  const parts: string[] = [
    "=== ORGANIZATION CONTEXT ===",
    `Organization: ${ctx.organizationName}`,
    `Mission: ${ctx.missionStatement || "[PLACEHOLDER: mission statement not provided]"}`,
    `Programs: ${ctx.programsServices || "[PLACEHOLDER: programs and services not described]"}`,
    `Target Population: ${ctx.targetPopulation || "[PLACEHOLDER: target population not specified]"}`,
    `Geographic Area: ${ctx.geographicArea || "[PLACEHOLDER: geographic area not specified]"}`,
    `Annual Budget: ${ctx.annualBudget ? `$${ctx.annualBudget.toLocaleString()}` : "[PLACEHOLDER: budget not provided]"}`,
    "",
    "=== GRANT CONTEXT ===",
    `Grant: ${ctx.grantTitle}`,
    `Funder: ${ctx.funder}`,
    `Requested Amount: ${ctx.requestedAmount ? `$${ctx.requestedAmount.toLocaleString()}` : "[PLACEHOLDER: amount not yet confirmed]"}`,
    `Project Title: ${ctx.projectTitle || "[PLACEHOLDER: project title not yet set]"}`,
  ];

  if (projectAngle) parts.push(`Project Angle: ${projectAngle}`);
  if (guardrailsBlock) parts.push("", guardrailsBlock);
  if (grantSpecificBlock) parts.push("", grantSpecificBlock);

  parts.push(
    "",
    dateRulesBlock,
    "",
    "=== WRITING RULES ===",
    "* Professional, sincere prose — no corporate jargon",
    "* Third person referring to the organization by name",
    "* Do NOT invent stats, staff credentials, partner names, past awards, or dollar amounts",
    "* Use [PLACEHOLDER: description] for every unknown fact",
    "* Target 300-400 words unless the section requires more",
    "* Do NOT include a section header — body text only",
    "* Produce a strong specific first draft, not filler that needs complete rewriting",
    "",
    "=== WRITE THIS SECTION ===",
    SECTION_GUIDES[sectionType]
  );

  return parts.join("\n");
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractPlaceholders(text: string): string[] {
  return text.match(/\[PLACEHOLDER:[^\]]+\]/g) ?? [];
}
// ── Main agent ──────────────────────────────────────────────────────────────────

export async function runWriterAgent(
  input: WriterAgentInput
): Promise<WriterAgentOutput & { agentRunId: string }> {
  const { applicationId, organizationId, triggeredById, sectionType, context } = input;

  const run = await startAgentRun({
    agentType: "WRITER",
    applicationId,
    triggeredById,
    inputPayload: { sectionType, organizationId },
  });

  try {
    const org = context ? null : await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const app = applicationId
      ? await prisma.grantApplication.findUnique({
          where: { id: applicationId },
          include: { opportunity: true },
        })
      : null;

    const writerContext: WriterContext = {
      organizationName: context?.organizationName ?? org?.name ?? "[PLACEHOLDER: organization name]",
      missionStatement: context?.missionStatement ?? org?.missionStatement ?? "",
      programsServices: context?.programsServices ?? org?.programsServices ?? "",
      targetPopulation: context?.targetPopulation ?? org?.targetPopulation ?? "",
      geographicArea:   context?.geographicArea   ?? org?.geographicArea   ?? "",
      annualBudget:     context?.annualBudget      ?? org?.annualBudget     ?? undefined,
      grantTitle:       context?.grantTitle        ?? app?.opportunity.title  ?? "[PLACEHOLDER: grant title]",
      funder:           context?.funder            ?? app?.opportunity.funder ?? "[PLACEHOLDER: funder]",
      requestedAmount:  context?.requestedAmount   ?? app?.requestedAmount  ?? undefined,
      projectTitle:     context?.projectTitle      ?? app?.projectTitle     ?? undefined,
      projectSummary:   context?.projectSummary    ?? app?.projectSummary   ?? undefined,
      strategicAngle:   context?.strategicAngle,
    };

    const prompt = buildSectionPrompt(sectionType, writerContext);

    const llmResult = await generateText(prompt, {
      maxTokens: 900,
      temperature: 0.65,
      systemPrompt:
        "You are an expert nonprofit grant writer. " +
        "Follow ALL rules in the prompt exactly. " +
        "Respond with ONLY the grant section text — no headers, no commentary, no markdown. " +
        "Produce a strong, specific, grant-ready first draft based strictly on the facts provided.",
    });

    const wordCount = countWords(llmResult.content);
    const placeholders = extractPlaceholders(llmResult.content);

    const complianceFlags = runComplianceCheck(
      llmResult.content,
      writerContext.organizationName,
      writerContext.grantTitle,
      writerContext.funder
    );

    if (applicationId) {
      const existing = await prisma.grantApplicationSection.findFirst({
        where: { applicationId, sectionType },
      });

      const sortOrder = GRANT_SECTION_ORDER.indexOf(sectionType);

      if (existing) {
        const versions = (existing.versions as object[]) ?? [];
        versions.push({
          content: existing.content,
          editedAt: new Date().toISOString(),
          editedBy: "writer-agent",
        });
        await prisma.grantApplicationSection.update({
          where: { id: existing.id },
          data: {
            content: llmResult.content,
            wordCount,
            versions,
            agentRunId: run.id,
            isApproved: false,
          },
        });
      } else {
        await prisma.grantApplicationSection.create({
          data: {
            applicationId,
            sectionType,
            title: GRANT_SECTION_LABELS[sectionType],
            content: llmResult.content,
            wordCount,
            sortOrder,
            agentRunId: run.id,
          },
        });
      }
    }

    await completeAgentRun(run.id, {
      outputPayload: {
        sectionType,
        wordCount,
        placeholderCount: placeholders.length,
        complianceFlagCount: complianceFlags.length,
        complianceFlagCodes: complianceFlags.map((f) => f.code),
      },
      rawResponse: llmResult.content,
      model: llmResult.model,
      promptTokens: llmResult.promptTokens,
      completionTokens: llmResult.completionTokens,
      totalTokens: llmResult.totalTokens,
      durationMs: llmResult.durationMs,
    });

    return { content: llmResult.content, wordCount, placeholders, complianceFlags, agentRunId: run.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await failAgentRun(run.id, msg);
    throw error;
  }
}

export async function runWriterAgentAllSections(
  input: Omit<WriterAgentInput, "sectionType">
): Promise<{
  results: (WriterAgentOutput & { sectionType: GrantSectionType; agentRunId: string })[];
  errors: string[];
}> {
  const results = [];
  const errors = [];

  for (const sectionType of GRANT_SECTION_ORDER) {
    try {
      const result = await runWriterAgent({ ...input, sectionType });
      results.push({ ...result, sectionType });
    } catch (error) {
      errors.push(`${sectionType}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { results, errors };
}