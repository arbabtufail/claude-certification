// The course notebook's helper functions in TypeScript, shared by the lesson 4-8 scripts.
// (The web app's copy is lib/courses/building-with-the-claude-api/helpers.ts.)
import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic(); // reads ANTHROPIC_API_KEY (node --env-file=.env.local)
export const model = "claude-sonnet-4-5"; // the course's model

// Lesson 4
export function addUserMessage(messages: Anthropic.MessageParam[], text: string) {
  messages.push({ role: "user", content: text });
}

export function addAssistantMessage(messages: Anthropic.MessageParam[], text: string) {
  messages.push({ role: "assistant", content: text });
}

// Lessons 4-8: chat(messages, { system, temperature, stopSequences })
export async function chat(
  messages: Anthropic.MessageParam[],
  opts: { system?: string; temperature?: number; stopSequences?: string[] } = {},
): Promise<string> {
  const params: Anthropic.MessageCreateParamsNonStreaming = { model, max_tokens: 1000, messages };
  if (opts.system) params.system = opts.system; // lesson 5: the API rejects system: null
  if (opts.temperature !== undefined) params.temperature = opts.temperature; // lesson 6
  if (opts.stopSequences) params.stop_sequences = opts.stopSequences; // lesson 8

  const message = await client.messages.create(params);
  const first = message.content[0];
  return first?.type === "text" ? first.text : "";
}
