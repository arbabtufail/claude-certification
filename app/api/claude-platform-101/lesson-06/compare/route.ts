// POST /api/claude-platform-101/lesson-06/compare
// The same question, sent once per thinking setting: "off" answers immediately; the rest think first at that effort.
import { sendMessage } from "@/lib/claude/send";
import { describeError } from "@/lib/claude/errors";
import {
  ANSWER_STYLES,
  LESSON_6_MAX_TOKENS,
  isAnswerStyle,
  isThinkingSetting,
  lesson6Model,
  type ThinkingSetting,
} from "@/lib/courses/claude-platform-101/lesson-06";
import { thinkingParams } from "@/lib/courses/claude-platform-101/lesson-06-tools";

export async function POST(req: Request) {
  const { prompt, model, settings, style } = await req.json();

  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "Prompt is empty" }, { status: 400 });
  if (!isAnswerStyle(style)) return Response.json({ error: "Unknown answer style" }, { status: 400 });
  const m = lesson6Model(model);
  if (!m) return Response.json({ error: "Pick one of this lesson's models" }, { status: 400 });
  if (!Array.isArray(settings) || settings.length === 0 || !settings.every(isThinkingSetting)) {
    return Response.json({ error: "Pick at least one thinking setting" }, { status: 400 });
  }
  if (!m.canDisable && settings.includes("off")) {
    return Response.json({ error: `${model} always thinks; "off" is not allowed` }, { status: 400 });
  }

  // Run every setting in parallel; one failure should not hide the others.
  const settled = await Promise.allSettled(
    (settings as ThinkingSetting[]).map((setting) =>
      sendMessage({
        model,
        maxTokens: LESSON_6_MAX_TOKENS,
        system: ANSWER_STYLES[style].system,
        prompt,
        ...thinkingParams(setting, "summarized"),
      }),
    ),
  );

  const results = settled.map((s, i) =>
    s.status === "fulfilled"
      ? { ok: true, setting: settings[i], ...s.value, raw: undefined }
      : { ok: false, setting: settings[i], ...describeError(s.reason) },
  );
  return Response.json({ results });
}
