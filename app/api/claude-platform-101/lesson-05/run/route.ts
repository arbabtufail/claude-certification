// POST /api/claude-platform-101/lesson-05/run
// The same Denver task, run one of two ways:
//   mode "manual": our own loop (lib/claude/agent-loop.ts) with JSON schemas and a switch
//   mode "runner": the SDK's tool runner with betaZodTool definitions
import { runAgentLoop } from "@/lib/claude/agent-loop";
import { runWithToolRunner } from "@/lib/claude/tool-runner";
import { isKnownModel } from "@/lib/claude/models";
import { sseResponse } from "@/lib/server/sse";
import { LESSON_5_MAX_TOKENS, LESSON_5_MAX_TURNS, isDescriptionStyle } from "@/lib/courses/claude-platform-101/lesson-05";
import { jsonTools, runLesson5Tool, zodTools } from "@/lib/courses/claude-platform-101/lesson-05-tools";

export async function POST(req: Request) {
  const { prompt, model, mode, descriptions } = await req.json();

  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "Prompt is empty" }, { status: 400 });
  if (!isKnownModel(model)) return Response.json({ error: "Unknown model" }, { status: 400 });
  if (mode !== "manual" && mode !== "runner") return Response.json({ error: "Unknown mode" }, { status: 400 });
  if (!isDescriptionStyle(descriptions)) return Response.json({ error: "Unknown description style" }, { status: 400 });

  return sseResponse(req, (send) =>
    mode === "manual"
      ? runAgentLoop({
          model,
          maxTokens: LESSON_5_MAX_TOKENS,
          tools: jsonTools(descriptions),
          runTool: runLesson5Tool,
          prompt,
          maxTurns: LESSON_5_MAX_TURNS,
          signal: req.signal,
          onEvent: send,
        })
      : runWithToolRunner({
          model,
          maxTokens: LESSON_5_MAX_TOKENS,
          tools: zodTools(descriptions),
          prompt,
          maxIterations: LESSON_5_MAX_TURNS,
          signal: req.signal,
          onEvent: send,
        }),
  );
}
