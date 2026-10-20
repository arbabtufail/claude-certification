// POST /api/claude-platform-101/lesson-03/compare
// Lesson 3: send the same prompt to several models. Only the `model` field changes.
// The lesson loops one model at a time; here the calls run in parallel so the page
// responds faster. Each call is still timed on its own.
import { sendMessage } from "@/lib/claude/send";
import { describeError } from "@/lib/claude/errors";
import { isKnownModel } from "@/lib/claude/models";

export async function POST(req: Request) {
  const { prompt, maxTokens, models } = await req.json();

  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "Prompt is empty" }, { status: 400 });
  if (!Array.isArray(models) || models.length === 0 || !models.every(isKnownModel)) {
    return Response.json({ error: "Pick at least one known model" }, { status: 400 });
  }
  const max = Number(maxTokens);
  if (!Number.isInteger(max) || max < 1 || max > 8192) {
    return Response.json({ error: "max_tokens must be between 1 and 8192" }, { status: 400 });
  }

  const settled = await Promise.allSettled(
    models.map((model: string) => sendMessage({ model, maxTokens: max, prompt })),
  );

  // One failing model should not hide the others' results.
  const results = settled.map((s, i) =>
    s.status === "fulfilled" ? { ok: true, ...s.value } : { ok: false, model: models[i], ...describeError(s.reason) },
  );
  return Response.json({ results });
}
