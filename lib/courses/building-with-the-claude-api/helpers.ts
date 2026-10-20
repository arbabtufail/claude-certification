// THE COURSE'S HELPER FUNCTIONS, IN TYPESCRIPT (server only)
// The Python notebook grows one chat() function lesson by lesson. This is its final shape:
//   lesson 4: add_user_message / add_assistant_message / chat(messages)
//   lesson 5: chat(messages, system=None)         -> only send `system` when there is one
//   lesson 6: chat(..., temperature=1.0)          -> only send it when asked (newer models reject it)
//   lesson 7: client.messages.stream(...)         -> see chatStream below
//   lesson 8: chat(..., stop_sequences=[...])
import type Anthropic from "@anthropic-ai/sdk";
import { client } from "@/lib/claude/client";
import { estimateCostUsd } from "@/lib/claude/models";
import type { SendResult } from "@/lib/claude/send";
import { COURSE_MODEL } from "./capabilities";

export const MAX_TOKENS = 1000;

// ---- Lesson 4: keep the conversation yourself --------------------------------------------
export function addUserMessage(messages: Anthropic.MessageParam[], text: string) {
  messages.push({ role: "user", content: text });
}

export function addAssistantMessage(messages: Anthropic.MessageParam[], text: string) {
  messages.push({ role: "assistant", content: text });
}

// ---- Lessons 5, 6, 8: optional parameters ------------------------------------------------
export type ChatOptions = {
  model?: string;
  maxTokens?: number;
  system?: string; // lesson 5
  temperature?: number; // lesson 6 (0 to 1)
  stopSequences?: string[]; // lesson 8
};

// Python builds a params dict and adds keys conditionally. Same idea here: the API rejects
// `system: null`, so a field is only included when it has a value.
export function buildParams(messages: Anthropic.MessageParam[], opts: ChatOptions = {}): Anthropic.MessageCreateParamsNonStreaming {
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: opts.model ?? COURSE_MODEL,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
    messages,
  };
  if (opts.system) params.system = opts.system;
  if (opts.temperature !== undefined) params.temperature = opts.temperature;
  if (opts.stopSequences?.length) params.stop_sequences = opts.stopSequences;
  return params;
}

// The lesson's chat(): returns just the text. Python's message.content[0].text, made safe:
// content[0] can be a thinking block on newer models, so take the text blocks.
export async function chat(messages: Anthropic.MessageParam[], opts: ChatOptions = {}): Promise<string> {
  const message = await client.messages.create(buildParams(messages, opts));
  return textOf(message);
}

// Same call, plus the numbers the pages show (tokens, cost, stop reason, the raw response).
export type ChatResult = SendResult & { stopSequence: string | null };

export async function chatDetailed(messages: Anthropic.MessageParam[], opts: ChatOptions = {}): Promise<ChatResult> {
  const params = buildParams(messages, opts);
  const started = performance.now();
  const message = await client.messages.create(params);
  return {
    model: params.model,
    text: textOf(message),
    thinkingText: "",
    stopReason: message.stop_reason,
    stopSequence: message.stop_sequence,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    thinkingTokens: 0,
    ms: Math.round(performance.now() - started),
    costUsd: estimateCostUsd(params.model, message.usage.input_tokens, message.usage.output_tokens),
    raw: message,
  };
}

// ---- Lesson 7: streaming ------------------------------------------------------------------
// client.messages.stream() is the SDK's helper (Python: `with client.messages.stream(...) as stream`).
// Iterate it for raw events, or use stream.on("text", ...) for text only; await stream.finalMessage()
// for the assembled message.
export function chatStream(messages: Anthropic.MessageParam[], opts: ChatOptions = {}, signal?: AbortSignal) {
  return client.messages.stream(buildParams(messages, opts), { signal });
}

export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
