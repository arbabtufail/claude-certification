// LESSON 2 PROMPTS: Your first API call
// The system prompt shapes the persona; the user message carries the input.

export const LESSON_2_MODEL = "claude-sonnet-5";
export const LESSON_2_MAX_TOKENS = 2048;

export type Lesson2TaskId = "review" | "summarize";

export const LESSON_2_TASKS: Record<
  Lesson2TaskId,
  { label: string; inputLabel: string; system: string; sample: string; buildPrompt: (input: string) => string }
> = {
  review: {
    label: "Code review",
    inputLabel: "Code to review",
    system: "You are a terse senior code reviewer. Give feedback in one paragraph.",
    sample: "function add(a, b) {\n  return a - b;\n}",
    buildPrompt: (input) => `Review this code:\n${input}`,
  },
  summarize: {
    label: "Meeting summary",
    inputLabel: "Meeting transcript",
    system:
      "You summarize meeting transcripts. Extract the key insights and the risks. " +
      "Reply with two short sections titled 'Insights' and 'Risks', each a bulleted list.",
    sample:
      "Priya: The checkout redesign is 80% done, but payments QA hasn't started.\n" +
      "Tom: Launch is still set for the 28th. Marketing already booked the campaign.\n" +
      "Priya: If QA slips a week we either launch without Apple Pay or move the date.\n" +
      "Lena: Support wants two days of training before any launch.\n" +
      "Tom: Let's keep the 28th for now and revisit Friday.",
    buildPrompt: (input) => `Summarize this meeting transcript:\n${input}`,
  },
};

export function isLesson2Task(id: unknown): id is Lesson2TaskId {
  return id === "review" || id === "summarize";
}
