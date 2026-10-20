// POST /api/building-with-the-claude-api/structured
// Lesson 8 on current models: structured outputs instead of prefill. Body: { model, prompt }
import { describeError } from "@/lib/claude/errors";
import { isKnownModel } from "@/lib/claude/models";
import { structuredEventBridgeRule } from "@/lib/courses/building-with-the-claude-api/lesson-08-server";

export async function POST(req: Request) {
  const { model, prompt } = await req.json();
  if (!isKnownModel(model)) return Response.json({ error: "Unknown model" }, { status: 400 });
  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "Prompt is empty" }, { status: 400 });

  try {
    return Response.json(await structuredEventBridgeRule(model, prompt));
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
