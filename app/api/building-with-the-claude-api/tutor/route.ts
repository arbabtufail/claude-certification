// POST /api/building-with-the-claude-api/tutor
// The course tutor chatbot. The browser sends the WHOLE conversation each time; the server adds the
// system prompt (which the browser never sets) and streams the reply back.
// Body: { messages, model, temperature?, lessonSlug }
import { isKnownModel } from "@/lib/claude/models";
import { getCourse } from "@/lib/courses";
import { validateConversation } from "@/lib/courses/building-with-the-claude-api/conversation";
import { streamTutor, type TutorEvent } from "@/lib/courses/building-with-the-claude-api/tutor";
import { sseResponse } from "@/lib/server/sse";

export async function POST(req: Request) {
  const { messages, model, temperature, lessonSlug } = await req.json();

  if (!isKnownModel(model)) return Response.json({ error: "Unknown model" }, { status: 400 });
  const checked = validateConversation(messages);
  if (typeof checked === "string") return Response.json({ error: checked }, { status: 400 });
  if (temperature !== undefined && temperature !== null && (typeof temperature !== "number" || temperature < 0 || temperature > 1)) {
    return Response.json({ error: "temperature must be a number from 0 to 1" }, { status: 400 });
  }
  const known = getCourse("building-with-the-claude-api").lessons.some((l) => l.slug === lessonSlug);

  return sseResponse<TutorEvent>(req, (send) =>
    streamTutor(
      { messages: checked, model, temperature: temperature ?? undefined, lessonSlug: known ? lessonSlug : null },
      req.signal,
      send,
    ),
  );
}
