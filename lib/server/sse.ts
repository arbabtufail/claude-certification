// SERVER-SENT EVENTS (server only)
// Wraps a long-running job so each event it sends reaches the browser immediately as "data: {json}\n\n".
import { describeError } from "@/lib/claude/errors";
import type { AgentStreamEvent } from "@/lib/claude/agent-loop";

// E is the event shape the job sends. On failure an { type: "error", status, error } event is sent instead.
export function sseResponse<E extends object = AgentStreamEvent>(
  req: Request,
  job: (send: (event: E) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: E) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // browser already disconnected
        }
      };

      try {
        await job(send);
      } catch (err) {
        if (!req.signal.aborted) send({ type: "error", ...describeError(err) } as unknown as E);
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
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
