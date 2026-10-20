// POST /api/claude-platform-101/lesson-12/run  { prompt, title }
// Steps 3-5: creates a session, opens its event stream, sends the kickoff, and relays every event to the page.
import { describeError } from "@/lib/claude/errors";
import { runSession } from "@/lib/courses/claude-platform-101/lesson-12-server";

export async function POST(req: Request) {
  const { prompt, title } = await req.json();
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
    return Response.json({ error: "Kickoff message must be 1-4000 characters" }, { status: 400 });
  }
  const safeTitle = typeof title === "string" && title.trim() ? title.slice(0, 120) : "Count lines demo";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          // browser went away
        }
      };
      try {
        await runSession(prompt, safeTitle, req.signal, send);
      } catch (err) {
        if (!req.signal.aborted) send({ type: "relay.error", ...describeError(err) });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Content-Type-Options": "nosniff" },
  });
}
