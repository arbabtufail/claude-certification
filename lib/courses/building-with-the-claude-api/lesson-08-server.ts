// LESSON 8 (server only): clean JSON on current models, where the lesson's prefill returns a 400.
// The replacement for "prefill to force JSON" is structured outputs: output_config.format with a schema.
// The API then guarantees the response matches the schema, so there is nothing to strip.
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { client } from "@/lib/claude/client";
import { estimateCostUsd } from "@/lib/claude/models";

// An EventBridge event pattern. `detail` has free-form keys, which a strict schema can't express,
// so Claude returns them as a list and the code below turns the list into the object AWS expects.
const EventPattern = z.object({
  source: z.array(z.string()),
  detail_type: z.array(z.string()),
  detail: z.array(z.object({ field: z.string(), values: z.array(z.string()) })),
});

export async function structuredEventBridgeRule(model: string, prompt: string) {
  const started = performance.now();
  const response = await client.messages.parse({
    model,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(EventPattern) },
  });
  const parsed = response.parsed_output; // null if the output didn't parse
  const rule = parsed && {
    source: parsed.source,
    "detail-type": parsed.detail_type,
    detail: Object.fromEntries(parsed.detail.map((d) => [d.field, d.values])),
  };
  return {
    model,
    rule,
    rawText: response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""),
    stopReason: response.stop_reason,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    ms: Math.round(performance.now() - started),
    costUsd: estimateCostUsd(model, response.usage.input_tokens, response.usage.output_tokens),
  };
}
