/**
 * Per-model pricing in USD cents per million tokens.
 * Source of truth for cost estimation. Update when providers change prices.
 *
 * Values are stored as integer cents-per-million-tokens to avoid floating point.
 * e.g. Claude Opus 4.6 input @ $15/Mtok → 1500 cents/Mtok.
 */

type ModelPricing = {
  /** cents per million input tokens */
  inputCentsPerMtok: number;
  /** cents per million output tokens */
  outputCentsPerMtok: number;
};

// Keep keys as the exact model IDs the SDKs use.
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic — Claude 4.6 family
  "claude-opus-4-6": { inputCentsPerMtok: 1500, outputCentsPerMtok: 7500 },
  "claude-opus-4-6[1m]": { inputCentsPerMtok: 1500, outputCentsPerMtok: 7500 },
  "claude-sonnet-4-6": { inputCentsPerMtok: 300, outputCentsPerMtok: 1500 },
  "claude-haiku-4-5-20251001": {
    inputCentsPerMtok: 100,
    outputCentsPerMtok: 500,
  },

  // OpenAI — used mainly for the free moderation endpoint; listed for chat fallbacks
  "gpt-4o-mini": { inputCentsPerMtok: 15, outputCentsPerMtok: 60 },

  // Sentinel for "we called a moderation endpoint that is free"
  "openai-moderation": { inputCentsPerMtok: 0, outputCentsPerMtok: 0 },
};

const UNKNOWN_MODEL_FALLBACK: ModelPricing = {
  inputCentsPerMtok: 1500,
  outputCentsPerMtok: 7500,
};

/**
 * Compute the cost of a single AI call in integer cents, rounded up so we never
 * undercount the budget. Unknown models fall back to the most expensive tier.
 */
export function computeCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? UNKNOWN_MODEL_FALLBACK;
  const inputCost = (inputTokens * pricing.inputCentsPerMtok) / 1_000_000;
  const outputCost = (outputTokens * pricing.outputCentsPerMtok) / 1_000_000;
  return Math.ceil(inputCost + outputCost);
}
