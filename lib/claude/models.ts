// THE MODEL CATALOG (plain data, safe to import from server and browser code)
// Lesson 3: four tiers, chosen with the `model` parameter. Prices are USD per 1M tokens.

export type Tier = "Opus" | "Sonnet" | "Haiku";

export type ModelInfo = {
  id: string;
  tier: Tier;
  name: string;
  inputPrice: number;
  outputPrice: number;
  note?: string;
};

export const MODELS: ModelInfo[] = [
  { id: "claude-opus-5-5", tier: "Opus", name: "Claude Opus 5.5", inputPrice: 4, outputPrice: 20, note: "Used in lesson 3" },
  { id: "claude-opus-5", tier: "Opus", name: "Claude Opus 5", inputPrice: 5, outputPrice: 25, note: "Used in lesson 6" },
  { id: "claude-sonnet-5", tier: "Sonnet", name: "Claude Sonnet 5", inputPrice: 2, outputPrice: 10, note: "Used in lessons 2 and 3" },
  { id: "claude-sonnet-5-5", tier: "Sonnet", name: "Claude Sonnet 5.5", inputPrice: 2, outputPrice: 10 },
  { id: "claude-sonnet-4-5", tier: "Sonnet", name: "Claude Sonnet 4.5", inputPrice: 3, outputPrice: 15, note: "API course lesson 3; deprecated, ends Nov 30 2026" },
  { id: "claude-haiku-4-5", tier: "Haiku", name: "Claude Haiku 4.5", inputPrice: 1, outputPrice: 5, note: "Used in lesson 3" },
  { id: "claude-haiku-5-5", tier: "Haiku", name: "Claude Haiku 5.5", inputPrice: 0.1, outputPrice: 0.5 },
];

export function getModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export function isKnownModel(id: unknown): id is string {
  return typeof id === "string" && MODELS.some((m) => m.id === id);
}

// response.usage is what your bill is calculated on.
export function estimateCostUsd(modelId: string, inputTokens: number, outputTokens: number): number {
  const m = getModel(modelId);
  if (!m) return 0;
  return (inputTokens * m.inputPrice + outputTokens * m.outputPrice) / 1_000_000;
}

// Lesson 10: prompt caching changes the input price. Writes cost 1.25x (5-minute cache), reads ~0.1x
// (0.05x on Claude Opus 5.5). Regular uncached input tokens cost the normal price.
export type CacheUsage = { inputTokens: number; cacheWriteTokens: number; cacheReadTokens: number; outputTokens: number };

export function cacheReadMultiplier(modelId: string): number {
  return modelId === "claude-opus-5-5" ? 0.05 : 0.1;
}

export function estimateCostWithCache(modelId: string, u: CacheUsage): number {
  const m = getModel(modelId);
  if (!m) return 0;
  const input = u.inputTokens + u.cacheWriteTokens * 1.25 + u.cacheReadTokens * cacheReadMultiplier(modelId);
  return (input * m.inputPrice + u.outputTokens * m.outputPrice) / 1_000_000;
}
