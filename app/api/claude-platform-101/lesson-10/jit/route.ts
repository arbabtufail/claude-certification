// POST /api/claude-platform-101/lesson-10/jit
// Pattern 1: the same question answered with the whole code book upfront vs pulled in just in time with tools.
import { describeError } from "@/lib/claude/errors";
import { LESSON_10_MODELS } from "@/lib/courses/claude-platform-101/lesson-10";
import { compareJustInTime } from "@/lib/courses/claude-platform-101/lesson-10-server";

export async function POST(req: Request) {
  const { question, model } = await req.json();
  if (typeof question !== "string" || !question.trim()) return Response.json({ error: "Question is empty" }, { status: 400 });
  if (!LESSON_10_MODELS.includes(model)) return Response.json({ error: "Pick one of this lesson's models" }, { status: 400 });
  try {
    return Response.json(await compareJustInTime(question, model));
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
