// BROWSER SIDE: calls the course's chat route. Used by the lesson pages.
import type { ChatMessage } from "./conversation";
import type { ChatResult } from "./helpers";

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  system?: string;
  temperature?: number;
  stopSequences?: string[];
};

export async function postChat(body: ChatRequest): Promise<ChatResult> {
  const res = await fetch("/api/building-with-the-claude-api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}
