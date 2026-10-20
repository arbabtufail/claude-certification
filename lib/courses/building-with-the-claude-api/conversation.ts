// THE MESSAGES LIST (plain data, safe for the browser)
// Lesson 4: Claude stores nothing. Your code keeps this list and sends ALL of it on every request.

export type Role = "user" | "assistant";
export type ChatMessage = { role: Role; content: string };

export const MAX_MESSAGES = 60;
export const MAX_MESSAGE_CHARS = 20_000;

// Checks a list from the browser before it reaches the API.
// allowPrefill: a list may END with an assistant message (lesson 8's prefill). Only the 4.5 models accept that.
export function validateConversation(value: unknown, { allowPrefill = false } = {}): ChatMessage[] | string {
  if (!Array.isArray(value) || value.length === 0) return "Add at least one message";
  if (value.length > MAX_MESSAGES) return `At most ${MAX_MESSAGES} messages`;
  const messages: ChatMessage[] = [];
  for (const [i, m] of value.entries()) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return `Message ${i + 1}: role must be "user" or "assistant"`;
    if (typeof m.content !== "string" || !m.content.trim()) return `Message ${i + 1} is empty`;
    if (m.content.length > MAX_MESSAGE_CHARS) return `Message ${i + 1} is longer than ${MAX_MESSAGE_CHARS} characters`;
    messages.push({ role: m.role, content: m.content });
  }
  if (messages[0].role !== "user") return "The first message must be from the user";
  if (!allowPrefill && messages.at(-1)!.role !== "user") return "The last message must be from the user";
  return messages;
}

export function validateStopSequences(value: unknown): string[] | string {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((s) => typeof s !== "string" || !s)) return "stop_sequences must be a list of non-empty strings";
  return value;
}
