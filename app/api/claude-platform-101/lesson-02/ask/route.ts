// POST /api/claude-platform-101/lesson-02/ask
// Lesson 2 "from script to product": the same messages.create call, wrapped in a route handler.
import { sendMessage } from "@/lib/claude/send";
import { describeError } from "@/lib/claude/errors";
import { isKnownModel } from "@/lib/claude/models";
import { LESSON_2_MAX_TOKENS, LESSON_2_TASKS, isLesson2Task } from "@/lib/courses/claude-platform-101/lesson-02";

export async function POST(req: Request) {
  const { task, input, model, system } = await req.json();

  if (!isLesson2Task(task)) return Response.json({ error: "Unknown task" }, { status: 400 });
  if (typeof input !== "string" || !input.trim()) return Response.json({ error: "Input is empty" }, { status: 400 });
  if (!isKnownModel(model)) return Response.json({ error: "Unknown model" }, { status: 400 });

  const config = LESSON_2_TASKS[task];
  try {
    const result = await sendMessage({
      model,
      maxTokens: LESSON_2_MAX_TOKENS,
      system: typeof system === "string" && system.trim() ? system : config.system,
      prompt: config.buildPrompt(input),
    });
    return Response.json(result);
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
