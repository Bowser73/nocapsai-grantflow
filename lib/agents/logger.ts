/**
 * GrantFlow AI — Agent Run Logger
 *
 * Every agent invocation writes an AgentRun row to the database.
 * This provides a complete audit trail of all AI-generated content,
 * enables regeneration of individual sections, and supports debugging.
 *
 * Usage:
 *   const run = await startAgentRun({ agentType: "WRITER", applicationId, triggeredById });
 *   // ... run the agent ...
 *   await completeAgentRun(run.id, { outputPayload, rawResponse, model, tokens });
 *   // or
 *   await failAgentRun(run.id, error.message);
 */

import prisma from "@/lib/db/prisma";
import type { AgentType, AgentRun } from "@prisma/client";

export interface StartAgentRunParams {
  agentType: AgentType;
  applicationId?: string;
  triggeredById?: string;
  inputPayload?: Record<string, unknown>;
  rawPrompt?: string;
}

export interface CompleteAgentRunParams {
  outputPayload?: Record<string, unknown>;
  rawResponse?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  durationMs?: number;
}

/**
 * Create an AgentRun record and mark it as RUNNING.
 * Call this before invoking the LLM.
 */
export async function startAgentRun(params: StartAgentRunParams): Promise<AgentRun> {
  const run = await prisma.agentRun.create({
    data: {
      agentType: params.agentType,
      status: "RUNNING",
      applicationId: params.applicationId,
      triggeredById: params.triggeredById,
      inputPayload: (params.inputPayload ?? {}) as never,
      rawPrompt: params.rawPrompt,
      startedAt: new Date(),
    },
  });
  return run;
}

/**
 * Mark an AgentRun as COMPLETED with output.
 * Call this after a successful LLM response.
 */
export async function completeAgentRun(
  runId: string,
  params: CompleteAgentRunParams
): Promise<AgentRun> {
  return prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: "COMPLETED",
      outputPayload: (params.outputPayload ?? {}) as never,
      rawResponse: params.rawResponse,
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.totalTokens,
      durationMs: params.durationMs,
      completedAt: new Date(),
    },
  });
}

/**
 * Mark an AgentRun as FAILED.
 * Call this in catch blocks when an agent errors out.
 */
export async function failAgentRun(runId: string, errorMessage: string): Promise<AgentRun> {
  return prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      errorMessage,
      completedAt: new Date(),
    },
  });
}

/**
 * Convenience wrapper: run an agent function with automatic logging.
 * Handles start/complete/fail automatically.
 *
 * @example
 *   const result = await withAgentRun(
 *     { agentType: "WRITER", applicationId },
 *     async (runId) => {
 *       const llmResult = await generateText(prompt);
 *       return { content: llmResult.content, agentRunId: runId };
 *     }
 *   );
 */
export async function withAgentRun<T>(
  params: StartAgentRunParams,
  fn: (runId: string) => Promise<T>
): Promise<T> {
  const run = await startAgentRun(params);

  try {
    const result = await fn(run.id);
    // Note: caller is responsible for calling completeAgentRun with LLM metadata
    // This wrapper handles the error case
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failAgentRun(run.id, message);
    throw error;
  }
}

/**
 * Get the most recent successful agent run for a given application + type.
 * Used to check if an agent has already run and avoid redundant calls.
 */
export async function getLastSuccessfulRun(
  applicationId: string,
  agentType: AgentType
): Promise<AgentRun | null> {
  return prisma.agentRun.findFirst({
    where: {
      applicationId,
      agentType,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
  });
}
