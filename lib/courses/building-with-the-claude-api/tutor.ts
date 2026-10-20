// THE COURSE TUTOR (server only): the chatbot that sits on every page of this course.
// It uses lessons 4-7 itself: the browser keeps the messages list (4), the server adds a system
// prompt (5), temperature is optional (6), and the reply streams (7).
import type Anthropic from "@anthropic-ai/sdk";
import { client } from "@/lib/claude/client";
import { estimateCostWithCache } from "@/lib/claude/models";
import { getCourse } from "@/lib/courses";
import { supportsEffort, supportsTemperature } from "./capabilities";
import type { ChatMessage } from "./conversation";
import { LESSON_NOTES } from "./knowledge";

export type TutorEvent =
  | { type: "text"; text: string }
  | {
      type: "done";
      stopReason: string | null;
      inputTokens: number;
      cacheReadTokens: number;
      cacheWriteTokens: number;
      outputTokens: number;
      costUsd: number;
      ms: number;
    };

export async function streamTutor(
  input: { messages: ChatMessage[]; model: string; temperature?: number; lessonSlug: string | null },
  signal: AbortSignal,
  send: (e: TutorEvent) => void,
) {
  const { stable, currentPage } = tutorSystemPrompt(input.lessonSlug);
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: input.model,
    max_tokens: TUTOR_MAX_TOKENS,
    system: [
      { type: "text", text: stable, cache_control: { type: "ephemeral" } },
      { type: "text", text: currentPage },
    ],
    messages: input.messages, // the whole conversation, every time (lesson 4)
    cache_control: { type: "ephemeral" }, // also cache the conversation so far for the next turn
  };
  if (supportsEffort(input.model)) params.output_config = { effort: "low" }; // chat: short and quick
  if (input.temperature !== undefined && supportsTemperature(input.model)) params.temperature = input.temperature;

  const started = performance.now();
  const stream = client.messages.stream(params, { signal });
  stream.on("text", (text) => send({ type: "text", text }));
  const final = await stream.finalMessage();

  const u = final.usage;
  const usage = {
    inputTokens: u.input_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    outputTokens: u.output_tokens,
  };
  send({
    type: "done",
    stopReason: final.stop_reason,
    ...usage,
    costUsd: estimateCostWithCache(input.model, usage),
    ms: Math.round(performance.now() - started),
  });
}

export const TUTOR_DEFAULT_MODEL = "claude-opus-5-5";
export const TUTOR_MAX_TOKENS = 4000;

const COURSE = "building-with-the-claude-api";

// Two parts: the long stable text (cached once, reused on every page) and a one-line note about the
// current page. Caching is a prefix match, so the part that changes goes last, after the cache breakpoint.
export function tutorSystemPrompt(lessonSlug: string | null): { stable: string; currentPage: string } {
  const course = getCourse(COURSE);
  const current = lessonSlug ? course.lessons.find((l) => l.slug === lessonSlug) : undefined;
  const notes = Object.values(LESSON_NOTES).join("\n\n");

  const stable = `You are the tutor for Anthropic's "Building with the Claude API" course (${course.totalLessons} lessons).
The student is working through it in a Next.js + TypeScript practice app ("Claude Course Preparations"),
translating the course's Python notebooks into TypeScript with the official @anthropic-ai/sdk package.

How to help:
- Explain concepts plainly and briefly. Short paragraphs; use a list only when the content is a list.
- Show code in TypeScript using @anthropic-ai/sdk, not Python, unless the student asks for Python.
- When the course's Python behaves differently on today's API, say so and give the current way.
- If a question is outside the course, answer briefly and connect it back where it fits.
- If you aren't sure about an API detail, say so instead of guessing.

Notes for the lessons built so far:

${notes}`;

  const currentPage = `The student is on: ${current ? `Lesson ${current.number}, ${current.title}.` : "the course overview."}`;
  return { stable, currentPage };
}
