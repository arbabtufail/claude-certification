// THE REQUEST (server only)
// Every lesson goes through this one function: messages.create with a model,
// max_tokens, an optional system prompt and a list of messages.
import type Anthropic from "@anthropic-ai/sdk";
import { client } from "./client";
import { estimateCostUsd } from "./models";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type SendInput = {
  model: string;
  maxTokens: number;
  system?: string;
  prompt: string;
  thinking?: Anthropic.ThinkingConfigParam; // lesson 6: e.g. { type: "adaptive", display: "summarized" }
  effort?: Effort; // lesson 6: goes inside output_config, not next to thinking
};

export type SendResult = {
  model: string;
  text: string;
  thinkingText: string; // summary of Claude's reasoning (empty unless display is "summarized")
  stopReason: Anthropic.Message["stop_reason"];
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  ms: number;
  costUsd: number;
  raw: Anthropic.Message;
};

export async function sendMessage({ model, maxTokens, system, prompt, thinking, effort }: SendInput): Promise<SendResult> {
  const started = performance.now();

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    ...(thinking ? { thinking } : {}),
    ...(effort ? { output_config: { effort } } : {}),
    messages: [{ role: "user", content: prompt }],
  });

  const ms = Math.round(performance.now() - started);
  const { input_tokens, output_tokens } = response.usage;

  return {
    model,
    text: extractText(response),
    thinkingText: extractThinking(response),
    stopReason: response.stop_reason,
    inputTokens: input_tokens,
    outputTokens: output_tokens,
    thinkingTokens: thinkingTokensOf(response.usage),
    ms,
    costUsd: estimateCostUsd(model, input_tokens, output_tokens),
    raw: response,
  };
}

// response.content is an ARRAY of blocks (text, thinking, tool_use, ...), not a string.
// Loop and keep only the text blocks.
export function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

// Thinking blocks carry a readable summary when the request asked for display: "summarized".
export function extractThinking(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.ThinkingBlock => block.type === "thinking")
    .map((block) => block.thinking)
    .filter(Boolean)
    .join("\n\n");
}

// Newer models report how many of the output tokens were spent thinking.
function thinkingTokensOf(usage: Anthropic.Usage): number {
  const details = (usage as { output_tokens_details?: { thinking_tokens?: number } }).output_tokens_details;
  return details?.thinking_tokens ?? 0;
}
