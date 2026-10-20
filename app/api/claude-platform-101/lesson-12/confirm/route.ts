// POST /api/claude-platform-101/lesson-12/confirm  { sessionId, eventId, allow }
// If a tool call pauses for approval (evaluated_permission "ask"), answer it here.
import { confirmTool } from "@/lib/claude/managed-agents";
import { describeError } from "@/lib/claude/errors";

export async function POST(req: Request) {
  const { sessionId, eventId, allow } = await req.json();
  if (!/^sesn_[A-Za-z0-9]{6,80}$/.test(String(sessionId)) || !/^sevt_[A-Za-z0-9]{6,80}$/.test(String(eventId))) {
    return Response.json({ error: "Bad ids" }, { status: 400 });
  }
  try {
    await confirmTool(sessionId, eventId, allow === true);
    return Response.json({ ok: true });
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
