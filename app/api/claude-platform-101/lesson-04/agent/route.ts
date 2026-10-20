// POST /api/claude-platform-101/lesson-04/agent
// Runs the agent loop and streams every step to the browser as server-sent events (SSE),
// like the lesson's production compliance agent.
import { runAgentLoop } from "@/lib/claude/agent-loop";
import { isKnownModel } from "@/lib/claude/models";
import { sseResponse } from "@/lib/server/sse";
import {
  LESSON_4_MAX_TOKENS,
  LESSON_4_MAX_TURNS,
  pickTools,
  runLesson4Tool,
} from "@/lib/courses/claude-platform-101/lesson-04";

export async function POST(req: Request) {
  const { prompt, model, tools: toolNames } = await req.json();

  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "Prompt is empty" }, { status: 400 });
  if (!isKnownModel(model)) return Response.json({ error: "Unknown model" }, { status: 400 });
  const tools = pickTools(toolNames);
  if (!tools) return Response.json({ error: "Unknown tool name" }, { status: 400 });

  return sseResponse(req, (send) =>
    runAgentLoop({
      model,
      maxTokens: LESSON_4_MAX_TOKENS,
      tools,
      runTool: runLesson4Tool,
      prompt,
      maxTurns: LESSON_4_MAX_TURNS,
      signal: req.signal,
      onEvent: send,
    }),
  );
}
