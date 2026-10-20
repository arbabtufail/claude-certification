// LESSON 3 SETTINGS: Making a request (Building with the Claude API)
// Plain data, safe for the browser. The API call is in lesson-03-server.ts (server only).

// The course's model. Deprecated: it stops working on Nov 30 2026; claude-sonnet-5-5 is its replacement.
export const LESSON_3_MODEL = "claude-sonnet-4-5";
export const LESSON_3_MAX_TOKENS = 1000;
export const LESSON_3_PROMPT = "What is quantum computing? Answer in one sentence";

// One entry in the messages list: who wrote it and what it says.
export type Role = "user" | "assistant";
export type LessonMessage = { role: Role; content: string };

// Checks the browser's input before it reaches the API.
// The list must start with a user message and alternate roles. It must also END with a user message:
// a trailing assistant message is a "prefill", which newer models reject with a 400.
export function validateMessages(value: unknown): LessonMessage[] | string {
  if (!Array.isArray(value) || value.length === 0) return "Add at least one message";
  const messages: LessonMessage[] = [];
  for (const [i, m] of value.entries()) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return `Message ${i + 1}: role must be "user" or "assistant"`;
    if (typeof m.content !== "string" || !m.content.trim()) return `Message ${i + 1} is empty`;
    if (i > 0 && m.role === value[i - 1].role) return `Messages ${i} and ${i + 1} have the same role; alternate user and assistant`;
    messages.push({ role: m.role, content: m.content });
  }
  if (messages[0].role !== "user") return "The first message must be from the user";
  if (messages.at(-1)!.role !== "user") return "The last message must be from the user (Claude writes the next assistant message)";
  return messages;
}

export const MAX_TOKENS_LIMIT = 16000;
