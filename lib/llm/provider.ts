/**
 * GrantFlow AI — LLM Provider Abstraction
 *
 * ALL agent code calls this module — never OpenAI directly.
 * To swap models: update DEFAULT_MODEL or set OPENAI_MODEL env var.
 * To swap providers: replace the OpenAI client with Anthropic, Mistral, etc.
 * and update the two exported functions below.
 *
 * @example
 *   const result = await generateText(prompt, { maxTokens: 2000 });
 *   const data = await generateStructuredOutput<MyType>(prompt, schema);
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// ─── Client setup ──────────────────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

export interface GenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
}

// ─── Core text generation ──────────────────────────────────────────────────────

/**
 * Generate a text response from the LLM.
 * Use for narrative sections, summaries, and free-form content.
 */
export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<LLMResponse> {
  const {
    model = DEFAULT_MODEL,
    maxTokens = 2000,
    temperature = 0.7,
    systemPrompt,
  } = options;

  const messages: ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const startTime = Date.now();

  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  });

  const durationMs = Date.now() - startTime;
  const choice = response.choices[0];

  return {
    content: choice.message.content ?? "",
    model: response.model,
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
    durationMs,
  };
}

// ─── Structured output generation ─────────────────────────────────────────────

/**
 * Generate a structured JSON response from the LLM.
 * Use for scores, checklists, eligibility analysis, and machine-readable output.
 *
 * @param prompt - The user prompt (describe the task)
 * @param schema - Plain-English description of the expected JSON shape (used in system prompt)
 * @param options - Model options
 */
export async function generateStructuredOutput<T = unknown>(
  prompt: string,
  schemaDescription: string,
  options: GenerateOptions = {}
): Promise<{ data: T; raw: LLMResponse }> {
  const systemPrompt = `You are a helpful assistant that responds ONLY with valid JSON.
${schemaDescription}
Do not include markdown code fences, explanations, or any text outside the JSON object.`;

  const response = await generateText(prompt, {
    ...options,
    systemPrompt,
    temperature: options.temperature ?? 0.2, // Lower temp for structured output
  });

  // Parse JSON, with a helpful error if it fails
  let data: T;
  try {
    // Strip accidental markdown fences if the model adds them
    const cleaned = response.content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    data = JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `LLM returned invalid JSON. Model: ${response.model}. Raw: ${response.content.slice(0, 200)}`
    );
  }

  return { data, raw: response };
}

// ─── Multi-turn conversation (for interactive flows) ───────────────────────────

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateConversationResponse(
  messages: ConversationMessage[],
  options: GenerateOptions = {}
): Promise<LLMResponse> {
  const { model = DEFAULT_MODEL, maxTokens = 2000, temperature = 0.7 } = options;

  const startTime = Date.now();

  const response = await openai.chat.completions.create({
    model,
    messages: messages as ChatCompletionMessageParam[],
    max_tokens: maxTokens,
    temperature,
  });

  return {
    content: response.choices[0].message.content ?? "",
    model: response.model,
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
    durationMs: Date.now() - startTime,
  };
}
