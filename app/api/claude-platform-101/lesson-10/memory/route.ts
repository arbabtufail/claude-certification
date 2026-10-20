// /api/claude-platform-101/lesson-10/memory
//   GET    -> every file in the memory directory (stored in this project's .memory/ folder)
//   DELETE -> wipe the memory directory
//   POST   -> { prompt, model } runs a NEW conversation with the memory tool, streaming each step
import { clearMemories, memoryTool, readAllMemories } from "@/lib/claude/memory-store";
import { runWithToolRunner } from "@/lib/claude/tool-runner";
import { sseResponse } from "@/lib/server/sse";
import { LESSON_10_MODELS } from "@/lib/courses/claude-platform-101/lesson-10";

export async function GET() {
  return Response.json({ files: await readAllMemories() });
}

export async function DELETE() {
  await clearMemories();
  return Response.json({ files: [] });
}

export async function POST(req: Request) {
  const { prompt, model } = await req.json();
  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "Prompt is empty" }, { status: 400 });
  if (!LESSON_10_MODELS.includes(model)) return Response.json({ error: "Pick one of this lesson's models" }, { status: 400 });

  // No system prompt about memory: declaring the memory tool makes Anthropic inject the
  // "check your memory directory first" instruction automatically.
  return sseResponse(req, (send) =>
    runWithToolRunner({ model, maxTokens: 2048, tools: [memoryTool()], prompt, maxIterations: 10, signal: req.signal, onEvent: send }),
  );
}
