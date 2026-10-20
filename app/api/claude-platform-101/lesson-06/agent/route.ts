// POST /api/claude-platform-101/lesson-06/agent
// The lesson's road trip agent: one weather tool, adaptive thinking, effort in output_config.
// Streams each step (including the thinking summaries) to the page.
import { runAgentLoop } from "@/lib/claude/agent-loop";
import { sseResponse } from "@/lib/server/sse";
import { LESSON_6_MAX_TOKENS, isThinkingSetting, lesson6Model } from "@/lib/courses/claude-platform-101/lesson-06";
import { WEATHER_TOOL, runLesson6Tool, thinkingParams } from "@/lib/courses/claude-platform-101/lesson-06-tools";

const MAX_TURNS = 10;

export async function POST(req: Request) {
  const { prompt, model, setting, display } = await req.json();

  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "Prompt is empty" }, { status: 400 });
  const m = lesson6Model(model);
  if (!m) return Response.json({ error: "Pick one of this lesson's models" }, { status: 400 });
  if (!isThinkingSetting(setting)) return Response.json({ error: "Unknown thinking setting" }, { status: 400 });
  if (setting === "off" && !m.canDisable) {
    return Response.json({ error: `${model} always thinks; "off" is not allowed` }, { status: 400 });
  }
  if (display !== "summarized" && display !== "omitted") {
    return Response.json({ error: "display must be summarized or omitted" }, { status: 400 });
  }

  return sseResponse(req, (send) =>
    runAgentLoop({
      model,
      maxTokens: LESSON_6_MAX_TOKENS,
      tools: [WEATHER_TOOL],
      runTool: runLesson6Tool,
      prompt,
      maxTurns: MAX_TURNS,
      signal: req.signal,
      onEvent: send,
      ...thinkingParams(setting, display),
    }),
  );
}
