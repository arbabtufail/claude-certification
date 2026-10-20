// LESSON 6 SETTINGS: What is thinking?
// Plain data, safe for the browser. The weather tool is in lesson-06-tools.ts (server only).
import type { Effort } from "@/lib/claude/send";

export const LESSON_6_MODEL = "claude-opus-5";
export const LESSON_6_MAX_TOKENS = 16000; // same as the lesson: room for thinking + answer

// "off" = thinking: { type: "disabled" }. Every other setting = adaptive thinking at that effort.
export type ThinkingSetting = "off" | Effort;
export const THINKING_SETTINGS: ThinkingSetting[] = ["off", "low", "medium", "high", "xhigh", "max"];

// Which models this lesson offers, and whether thinking can be switched off on them.
// Claude Opus 5.5 always thinks: { type: "disabled" } returns a 400, so use low effort instead.
// Claude Opus 5 and Haiku 5.5 accept "disabled" only at effort high or below; we send it without an effort.
export const LESSON_6_MODELS: { id: string; canDisable: boolean; defaultEffort: Effort }[] = [
  { id: "claude-opus-5", canDisable: true, defaultEffort: "high" },
  { id: "claude-opus-5-5", canDisable: false, defaultEffort: "medium" },
  { id: "claude-sonnet-5", canDisable: true, defaultEffort: "high" },
  { id: "claude-haiku-5-5", canDisable: true, defaultEffort: "medium" },
];

export function lesson6Model(id: unknown) {
  return LESSON_6_MODELS.find((m) => m.id === id);
}

export function isThinkingSetting(v: unknown): v is ThinkingSetting {
  return typeof v === "string" && (THINKING_SETTINGS as string[]).includes(v);
}

// ---------------------------------------------------------------------------------------------
// Part 1: answer immediately vs think first
// ---------------------------------------------------------------------------------------------
// "instant" reproduces the lesson's failure mode: the model must reply at once, with no room to work it out.
// "working" lets it write its steps in the visible answer, which already helps even with thinking off.
export type AnswerStyle = "instant" | "working";

export const ANSWER_STYLES: Record<AnswerStyle, { label: string; help: string; system: string }> = {
  instant: {
    label: "Instant answer",
    help: "System prompt forbids any working. This is the lesson's failure mode.",
    system: "Reply with only one line in the form 'Answer: <answer>'. Do not show any working.",
  },
  working: {
    label: "Show working",
    help: "Claude may reason in the visible reply, which often rescues it even with thinking off.",
    system: "Solve the problem. End your reply with a final line in the form 'Answer: <answer>'.",
  },
};

export function isAnswerStyle(v: unknown): v is AnswerStyle {
  return v === "instant" || v === "working";
}

export type Puzzle = {
  id: string;
  label: string;
  prompt: string;
  expected: string; // shown to you
  mustInclude: string[]; // every one must appear in Claude's "Answer:" line to count as correct
  kind: "multi-step" | "simple";
};

export const PUZZLES: Puzzle[] = [
  {
    id: "apples",
    label: "Apples (multi-step)",
    prompt:
      "I start with 12 apples. I give away a third of them, then eat 2. Then I buy as many apples as I currently have, " +
      "and give half of all my apples to my sister. My sister gives me back 1 apple for every 3 she received. " +
      "How many apples do I have now?",
    expected: "8",
    mustInclude: ["8"],
    kind: "multi-step",
  },
  {
    id: "letters",
    label: "Count letters",
    prompt: "How many times does the letter 'r' appear in: strawberry, raspberry, cranberry?",
    expected: "9",
    mustInclude: ["9"],
    kind: "multi-step",
  },
  {
    id: "race",
    label: "Race order (logic)",
    prompt:
      "Ana, Ben, Leo, Maya and Sam ran a race. Maya finished after Ana but before Leo. Sam finished right after Leo. " +
      "Ana was not first. Who finished first, and who finished last?",
    expected: "Ben first, Sam last",
    mustInclude: ["ben", "sam"],
    kind: "multi-step",
  },
  {
    id: "days",
    label: "Days of the week",
    prompt: "If the day after tomorrow is three days before Sunday, what day was yesterday?",
    expected: "Monday",
    mustInclude: ["monday"],
    kind: "multi-step",
  },
  {
    id: "sentiment",
    label: "Simple classification",
    prompt:
      "Classify the sentiment of this review as positive, negative or mixed: " +
      "'The delivery was late, but the food was fantastic.'",
    expected: "mixed",
    mustInclude: ["mixed"],
    kind: "simple",
  },
];

// Pull the "Answer: ..." line out of Claude's reply and check it.
export function finalAnswer(text: string): string {
  const lines = text.split("\n").filter((l) => /answer\s*:/i.test(l));
  const last = lines.at(-1) ?? "";
  return last.replace(/.*answer\s*:\s*/i, "").replace(/[*_`]/g, "").trim();
}

export function isCorrect(puzzle: Puzzle, answer: string): boolean {
  const a = answer.toLowerCase();
  return puzzle.mustInclude.every((k) => new RegExp(`\\b${k}\\b`).test(a));
}

// ---------------------------------------------------------------------------------------------
// Part 2: thinking in action (the lesson's road trip agent)
// ---------------------------------------------------------------------------------------------
export const ROAD_TRIP_PROMPT = "Plan a road trip out of San Francisco with two stops, weighing weather and drive time.";

export const LESSON_6_SNIPPET = `const response = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 16000,
  thinking: { type: "adaptive", display: "summarized" }, // summarized = return the reasoning text
  output_config: { effort: "high" },                     // low | medium | high | xhigh | max
  tools: [weatherTool],
  messages: [{ role: "user", content: "Plan a road trip out of San Francisco with two stops, ..." }],
});`;
