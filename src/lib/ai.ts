/**
 * Provider-agnostic AI layer.
 * Supports Anthropic Claude and OpenAI GPT.
 */

import type { BillSection } from "./bill-sections";
import { buildSectionIndex, filterSections } from "./bill-sections";
import type { BillMetadata } from "./congress-api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiUsageRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface ChatResponse {
  content: string;
  usage: AiUsageRecord;
}

/** Return shape for chat helpers that may make multiple provider calls. */
export interface AiChatResult {
  content: string;
  usage: AiUsageRecord[];
}

type Provider = "anthropic" | "openai";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
/** Cheaper model for bounded, structured tasks like diff summarization
 *  where the input is already constrained and hallucination risk is low. */
const ANTHROPIC_HAIKU_MODEL = "claude-haiku-4-5-20251001";
const OPENAI_MODEL = "gpt-4o";
const OPENAI_CHEAP_MODEL = "gpt-4o-mini";

/** Threshold (chars) above which we use two-step section filtering. */
const LARGE_BILL_THRESHOLD = 100_000;

function detectProvider(): Provider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error(
    "No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."
  );
}

async function callAnthropic(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens = 2048,
  model: string = ANTHROPIC_MODEL,
): Promise<ChatResponse> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000 });

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return {
    content: textBlock?.text || "",
    usage: {
      model,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    },
  };
}

async function callOpenAI(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens = 2048,
  model: string = OPENAI_MODEL,
): Promise<ChatResponse> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000 });

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  return {
    content: response.choices[0]?.message?.content || "",
    usage: {
      model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}

/** Tier selection for callProvider. "cheap" uses Haiku/4o-mini for bounded
 *  tasks where hallucination risk is low; "quality" uses Sonnet/4o. */
type ModelTier = "cheap" | "quality";

async function callProvider(
  provider: Provider,
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens?: number,
  tier: ModelTier = "quality",
): Promise<ChatResponse> {
  if (provider === "anthropic") {
    const model = tier === "cheap" ? ANTHROPIC_HAIKU_MODEL : ANTHROPIC_MODEL;
    return callAnthropic(systemPrompt, messages, maxTokens, model);
  }
  const model = tier === "cheap" ? OPENAI_CHEAP_MODEL : OPENAI_MODEL;
  return callOpenAI(systemPrompt, messages, maxTokens, model);
}

// ── Bill chat ──────────────────────────────────────────────────────

/**
 * Format bill metadata into a compact context block. Returns "" if nothing useful.
 */
function formatMetadataForPrompt(meta: BillMetadata | null): string {
  if (!meta) return "";
  const lines: string[] = [];
  if (meta.sponsor) lines.push(`Sponsor: ${meta.sponsor}`);
  if (meta.cosponsorCount != null && meta.cosponsorCount > 0) {
    lines.push(
      `Cosponsors: ${meta.cosponsorCount}${meta.cosponsorPartySplit ? ` (${meta.cosponsorPartySplit})` : ""}`,
    );
  } else if (meta.cosponsorCount === 0) {
    lines.push("Cosponsors: none");
  }
  if (meta.policyArea) lines.push(`Policy area: ${meta.policyArea}`);
  if (meta.latestActionDate && meta.latestActionText) {
    lines.push(`Latest action (${meta.latestActionDate}): ${meta.latestActionText}`);
  }
  return lines.length > 0 ? lines.join("\n") : "";
}

/**
 * Format sections into a labeled text block for the system prompt.
 */
function formatSectionsForPrompt(sections: BillSection[]): string {
  return sections
    .map(
      (s) =>
        `[${s.sectionRef}] ${s.heading}\n${s.content}`,
    )
    .join("\n\n---\n\n");
}

const CITATION_INSTRUCTIONS = `
IMPORTANT — follow these rules when answering:
1. Support your answers with direct quotes from the bill text using markdown blockquotes.
2. Format each quote like this:

   > "exact quoted text from the bill"
   >
   > — Section X(y)

3. After each quote, explain what it means in plain language.
4. If the bill text does not address the user's question, say so explicitly.
5. Never fabricate quotes. Only quote text that appears verbatim in the bill above.
6. Keep your language clear and accessible — avoid legal jargon where possible.`;

/**
 * Generate a chat response about a bill using structured sections.
 */
export async function generateBillChatResponse(
  billTitle: string,
  billSections: BillSection[] | null,
  conversationHistory: ChatMessage[],
  userMessage: string,
  metadata: BillMetadata | null = null,
): Promise<AiChatResult> {
  const provider = detectProvider();
  const metadataBlock = formatMetadataForPrompt(metadata);
  const usage: AiUsageRecord[] = [];

  // No sections available — answer from title/metadata only
  if (!billSections || billSections.length === 0) {
    const systemPrompt = `You are a helpful, nonpartisan assistant that helps citizens understand U.S. legislation. You answer questions about bills clearly and accessibly, avoiding jargon where possible.

The bill is titled "${billTitle}".${
      metadataBlock ? `\n\nBill information:\n${metadataBlock}` : ""
    }

Full bill text is not available. Answer based on the title and any metadata above. Be upfront that you cannot provide direct quotes from the bill text.

Stay factual and neutral.`;

    const messages: ChatMessage[] = [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    const response = await callProvider(provider, systemPrompt, messages);
    usage.push(response.usage);
    return { content: response.content, usage };
  }

  // Check total size to decide approach
  const totalChars = billSections.reduce(
    (sum, s) => sum + s.heading.length + s.content.length,
    0,
  );

  let sectionsToUse = billSections;

  // Two-step approach for very large bills
  if (totalChars > LARGE_BILL_THRESHOLD) {
    const filtered = await filterRelevantSections(
      provider,
      billTitle,
      billSections,
      userMessage,
    );
    sectionsToUse = filtered.sections;
    usage.push(filtered.usage);
  }

  const billTextBlock = formatSectionsForPrompt(sectionsToUse);

  const systemPrompt = `You are a helpful, nonpartisan assistant that helps citizens understand U.S. legislation. You answer questions clearly and accessibly, prioritizing direct quotes from the bill text.

${metadataBlock ? `Bill information:\n${metadataBlock}\n\n` : ""}Here is the text of "${billTitle}", organized by section:

${billTextBlock}

${CITATION_INSTRUCTIONS}`;

  const messages: ChatMessage[] = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const response = await callProvider(provider, systemPrompt, messages);
  usage.push(response.usage);
  return { content: response.content, usage };
}

/**
 * Two-step filtering: ask the model which sections are relevant,
 * then return only those sections for the main prompt.
 */
async function filterRelevantSections(
  provider: Provider,
  billTitle: string,
  allSections: BillSection[],
  userMessage: string,
): Promise<{ sections: BillSection[]; usage: AiUsageRecord }> {
  const index = buildSectionIndex(allSections);

  const systemPrompt = `You are a legislative research assistant. Given a table of contents for a bill and a user's question, identify which sections are most likely to contain the answer.

Bill: "${billTitle}"

Table of contents:
${index}

Return ONLY a JSON array of section references that are relevant to the question. Example: ["Section 2", "Section 5(a)"]
Return at most 15 sections. If unsure, include more rather than fewer.`;

  const messages: ChatMessage[] = [
    { role: "user", content: userMessage },
  ];

  const response = await callProvider(provider, systemPrompt, messages, 512);

  // Parse the JSON array from the response
  try {
    const match = response.content.match(/\[[\s\S]*\]/);
    if (match) {
      const refs: string[] = JSON.parse(match[0]);
      const filtered = filterSections(allSections, refs);
      if (filtered.length > 0) return { sections: filtered, usage: response.usage };
    }
  } catch {
    // Fall back to all sections if parsing fails
  }

  // Fallback: return first 30 sections (better than nothing)
  return { sections: allSections.slice(0, 30), usage: response.usage };
}

// ── Change summary ─────────────────────────────────────────────────

/**
 * Generate a plain-language summary of what changed between two bill versions.
 * The summary is cached in BillTextVersion.changeSummary after generation.
 */
export async function generateChangeSummary(
  billTitle: string,
  previousText: string,
  currentText: string,
  previousVersionType: string,
  currentVersionType: string,
): Promise<AiChatResult> {
  const provider = detectProvider();

  const systemPrompt =
    "You are a nonpartisan legislative analyst. Given two versions of a bill, provide a clear, plain-language summary of what changed. Focus on substantive policy changes — new provisions, removed sections, changed numbers or thresholds, altered scope. Skip procedural or formatting changes. Write 2-4 sentences maximum. Do not use bullet points. Write for a general audience, not lawyers.";

  const userPrompt = `Bill: "${billTitle}"

Previous version (${previousVersionType}):
${previousText.slice(0, 30000)}

Current version (${currentVersionType}):
${currentText.slice(0, 30000)}

Summarize the substantive changes between these two versions.`;

  const messages: ChatMessage[] = [{ role: "user", content: userPrompt }];

  // "cheap" tier — this is a bounded diff summarization task. Research shows
  // hallucination risk drops sharply when the model describes a structured
  // delta vs. generating a summary from scratch, so Haiku is sufficient.
  const response = await callProvider(provider, systemPrompt, messages, 1024, "cheap");
  return { content: response.content, usage: [response.usage] };
}
