// POST /api/claude-platform-101/lesson-10/caching
// Pattern 3: three questions in a row against the same big system prompt, with or without cache_control.
import { describeError } from "@/lib/claude/errors";
import { CODE_QUESTIONS, LESSON_10_MODELS } from "@/lib/courses/claude-platform-101/lesson-10";
import { runCaching } from "@/lib/courses/claude-platform-101/lesson-10-server";

export async function POST(req: Request) {
  const { model, useCache } = await req.json();
  if (!LESSON_10_MODELS.includes(model)) return Response.json({ error: "Pick one of this lesson's models" }, { status: 400 });
  try {
    return Response.json(await runCaching(model, CODE_QUESTIONS, useCache === true));
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
