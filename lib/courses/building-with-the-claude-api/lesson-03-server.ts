// LESSON 3 (server only): the lesson's request, in TypeScript.
//   Python                                  TypeScript
//   client = Anthropic()                    const client = new Anthropic()   (lib/claude/client.ts)
//   client.messages.create(model=..., ...)  client.messages.create({ model, max_tokens, messages })
//   message.content[0].text                 narrow by block.type first (see below)
import type Anthropic from "@anthropic-ai/sdk";
import { client } from "@/lib/claude/client";
import { estimateCostUsd } from "@/lib/claude/models";
import type { SendResult } from "@/lib/claude/send";
import type { LessonMessage } from "./lesson-03";

export type Lesson3Result = SendResult & { firstBlockType: string };

export async function makeRequest(model: string, maxTokens: number, messages: LessonMessage[]): Promise<Lesson3Result> {
  const started = performance.now();

  // The three required parameters: model, max_tokens (a safety cap, not a target) and messages.
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages,
  });

  const ms = Math.round(performance.now() - started);

  // Python's message.content[0].text. In TypeScript content[0] could be any block type
  // (text, thinking, tool_use...), so check .type before reading .text.
  const first = message.content[0];
  const text = first?.type === "text" ? first.text : textBlocks(message);

  return {
    model,
    text,
    thinkingText: "",
    stopReason: message.stop_reason,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    thinkingTokens: 0,
    ms,
    costUsd: estimateCostUsd(model, message.usage.input_tokens, message.usage.output_tokens),
    raw: message,
    firstBlockType: first?.type ?? "none",
  };
}

// Fallback when content[0] isn't text (e.g. a thinking block on models that think by default).
function textBlocks(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
