// POST /api/claude-platform-101/lesson-08/report
// The lesson's call: one-line prompt + the activity log, with the Skill attached through container.skills.
// With skillId null, the same prompt runs with no Skill and no tools, so you can compare the output.
import { callWithServerTools } from "@/lib/claude/server-tools";
import { describeError } from "@/lib/claude/errors";
import {
  CODE_EXECUTION_TOOL,
  LESSON_8_MAX_TOKENS,
  LESSON_8_MODELS,
  reportPrompt,
  skillContainer,
} from "@/lib/courses/claude-platform-101/lesson-08";

export async function POST(req: Request) {
  const { skillId, log, model } = await req.json();

  if (typeof log !== "string" || !log.trim()) return Response.json({ error: "Activity log is empty" }, { status: 400 });
  if (!LESSON_8_MODELS.includes(model)) return Response.json({ error: "Pick one of this lesson's models" }, { status: 400 });
  if (skillId !== null && (typeof skillId !== "string" || !/^[A-Za-z0-9_-]{4,100}$/.test(skillId))) {
    return Response.json({ error: "Bad skill id" }, { status: 400 });
  }

  try {
    const result = await callWithServerTools({
      model,
      maxTokens: LESSON_8_MAX_TOKENS,
      prompt: reportPrompt(log),
      ...(skillId
        ? { tools: [CODE_EXECUTION_TOOL], container: skillContainer(skillId) }
        : { tools: [] }),
      signal: req.signal,
    });
    return Response.json(result);
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
