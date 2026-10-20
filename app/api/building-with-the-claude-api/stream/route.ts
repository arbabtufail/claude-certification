// POST /api/building-with-the-claude-api/stream
// Lesson 7: relays every raw stream event to the browser as it arrives, then the assembled final message.
// Body: { model, prompt }
import { isKnownModel } from "@/lib/claude/models";
import { chatStream } from "@/lib/courses/building-with-the-claude-api/helpers";
import type { StreamRelayEvent } from "@/lib/courses/building-with-the-claude-api/lesson-07";
import { sseResponse } from "@/lib/server/sse";

export async function POST(req: Request) {
  const { model, prompt } = await req.json();
  if (!isKnownModel(model)) return Response.json({ error: "Unknown model" }, { status: 400 });
  if (typeof prompt !== "string" || !prompt.trim()) return Response.json({ error: "Prompt is empty" }, { status: 400 });

  return sseResponse<StreamRelayEvent>(req, async (send) => {
    const started = performance.now();
    const ms = () => Math.round(performance.now() - started);
    const stream = chatStream([{ role: "user", content: prompt }], { model }, req.signal);

    // Each raw event: message_start, content_block_start, content_block_delta..., message_stop
    for await (const event of stream) send({ type: "event", ms: ms(), event });

    // After the stream ends: the complete message, for storing in a database.
    send({ type: "final", ms: ms(), message: await stream.finalMessage() });
  });
}
