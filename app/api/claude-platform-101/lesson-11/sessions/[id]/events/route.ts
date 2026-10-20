// GET /api/claude-platform-101/lesson-11/sessions/[id]/events
// Relays the session's event stream to the browser (history first, then live), until the task is done.
// Safe to call again after a page reload: it replays what happened and continues.
import { streamSessionEvents } from "@/lib/claude/managed-agents";
import { describeError } from "@/lib/claude/errors";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^sesn_[A-Za-z0-9]{6,80}$/.test(id)) return Response.json({ error: "Bad session id" }, { status: 400 });

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
        await streamSessionEvents(id, req.signal, send);
      } catch (err) {
        if (!req.signal.aborted) send({ type: "relay.error", ...describeError(err) });
      } finally {
        send({ type: "relay.closed" });
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
