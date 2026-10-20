// POST /api/building-with-the-claude-api/lesson-03/request
// Lesson 3: one messages.create call with the lesson's three parameters.
import { describeError } from "@/lib/claude/errors";
import { isKnownModel } from "@/lib/claude/models";
import { MAX_TOKENS_LIMIT, validateMessages } from "@/lib/courses/building-with-the-claude-api/lesson-03";
import { makeRequest } from "@/lib/courses/building-with-the-claude-api/lesson-03-server";

export async function POST(req: Request) {
  const { model, maxTokens, messages } = await req.json();

  if (!isKnownModel(model)) return Response.json({ error: "Unknown model" }, { status: 400 });
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > MAX_TOKENS_LIMIT) {
    return Response.json({ error: `max_tokens must be a whole number from 1 to ${MAX_TOKENS_LIMIT}` }, { status: 400 });
  }
  const checked = validateMessages(messages);
  if (typeof checked === "string") return Response.json({ error: checked }, { status: 400 });

  try {
    return Response.json(await makeRequest(model, maxTokens, checked));
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
