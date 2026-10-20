// POST /api/claude-platform-101/lesson-09/run
// The lesson's call: mcp_servers (the connection) + an mcp_toolset (which tools Claude may use), beta header on.
import { callWithMcp } from "@/lib/claude/mcp";
import { describeError } from "@/lib/claude/errors";
import { LESSON_9_MODELS } from "@/lib/courses/claude-platform-101/lesson-09";
import { resolveServer } from "@/lib/courses/claude-platform-101/lesson-09-servers";

export async function POST(req: Request) {
  const { server, prompt, model, maxTokens, allowlist } = await req.json();

  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "Prompt is empty" }, { status: 400 });
  if (!LESSON_9_MODELS.includes(model)) return Response.json({ error: "Pick one of this lesson's models" }, { status: 400 });
  const max = Number(maxTokens);
  if (!Number.isInteger(max) || max < 256 || max > 16000) {
    return Response.json({ error: "max_tokens must be between 256 and 16000" }, { status: 400 });
  }
  if (allowlist !== null && (!Array.isArray(allowlist) || !allowlist.every((t) => typeof t === "string" && /^[\w.-]{1,100}$/.test(t)))) {
    return Response.json({ error: "allowlist must be null or a list of tool names" }, { status: 400 });
  }
  const resolved = resolveServer(server);
  if ("error" in resolved) return Response.json({ error: resolved.error }, { status: 400 });

  try {
    return Response.json(await callWithMcp({ model, maxTokens: max, prompt, server: resolved, allowlist, signal: req.signal }));
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
