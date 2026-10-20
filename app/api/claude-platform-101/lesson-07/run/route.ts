// POST /api/claude-platform-101/lesson-07/run
// One messages.create call with a server tool declared. Anthropic runs the tool; we just read the blocks.
import { callWithServerTools } from "@/lib/claude/server-tools";
import { describeError } from "@/lib/claude/errors";
import { LESSON_7_MODELS, isDemoId, isSearchVersion, toolsFor } from "@/lib/courses/claude-platform-101/lesson-07";

export async function POST(req: Request) {
  const { demo, prompt, model, maxTokens, searchVersion = "web_search_20260209" } = await req.json();

  if (!isDemoId(demo)) return Response.json({ error: "Unknown demo" }, { status: 400 });
  if (!isSearchVersion(searchVersion)) return Response.json({ error: "Unknown web search version" }, { status: 400 });
  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "Prompt is empty" }, { status: 400 });
  if (!LESSON_7_MODELS.includes(model)) return Response.json({ error: "Pick one of this lesson's models" }, { status: 400 });
  const max = Number(maxTokens);
  if (!Number.isInteger(max) || max < 256 || max > 16000) {
    return Response.json({ error: "max_tokens must be between 256 and 16000" }, { status: 400 });
  }

  try {
    const result = await callWithServerTools({ model, maxTokens: max, tools: toolsFor(demo, searchVersion), prompt, signal: req.signal });
    return Response.json(result);
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
