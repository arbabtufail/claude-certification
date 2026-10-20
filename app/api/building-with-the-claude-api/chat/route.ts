// POST /api/building-with-the-claude-api/chat
// The course's chat() function behind one route, used by lessons 4, 5, 6 and 8.
// Body: { model, messages, system?, temperature?, stopSequences? }
// Errors from the API (e.g. temperature or prefill on a newer model) come back as-is: they're part of the lesson.
import { describeError } from "@/lib/claude/errors";
import { isKnownModel } from "@/lib/claude/models";
import { validateConversation, validateStopSequences } from "@/lib/courses/building-with-the-claude-api/conversation";
import { chatDetailed } from "@/lib/courses/building-with-the-claude-api/helpers";

export async function POST(req: Request) {
  const { model, messages, system, temperature, stopSequences } = await req.json();

  if (!isKnownModel(model)) return Response.json({ error: "Unknown model" }, { status: 400 });
  const checked = validateConversation(messages, { allowPrefill: true });
  if (typeof checked === "string") return Response.json({ error: checked }, { status: 400 });
  if (system !== undefined && system !== null && typeof system !== "string") {
    return Response.json({ error: "system must be a string" }, { status: 400 });
  }
  if (temperature !== undefined && temperature !== null && (typeof temperature !== "number" || temperature < 0 || temperature > 1)) {
    return Response.json({ error: "temperature must be a number from 0 to 1" }, { status: 400 });
  }
  const stops = validateStopSequences(stopSequences);
  if (typeof stops === "string") return Response.json({ error: stops }, { status: 400 });

  try {
    const result = await chatDetailed(checked, {
      model,
      system: system?.trim() || undefined,
      temperature: temperature ?? undefined,
      stopSequences: stops,
    });
    return Response.json(result);
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
