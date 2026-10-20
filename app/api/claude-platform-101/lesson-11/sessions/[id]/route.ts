// /api/claude-platform-101/lesson-11/sessions/[id]
//   GET  -> status, usage, grader results, and the files the agent wrote to /mnt/session/outputs/
//   POST -> { action: "confirm", eventId, allow } answers a paused tool call; { action: "interrupt" } stops the work
import { confirmTool, interruptSession, listOutputs, sessionSummary } from "@/lib/claude/managed-agents";
import { describeError } from "@/lib/claude/errors";

const isId = (v: unknown, prefix: string): v is string => typeof v === "string" && new RegExp(`^${prefix}_[A-Za-z0-9]{6,80}$`).test(v);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isId(id, "sesn")) return Response.json({ error: "Bad session id" }, { status: 400 });
  try {
    const [summary, outputs] = await Promise.all([sessionSummary(id), listOutputs(id).catch(() => [])]);
    return Response.json({ ...summary, outputs });
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isId(id, "sesn")) return Response.json({ error: "Bad session id" }, { status: 400 });
  const { action, eventId, allow } = await req.json();
  try {
    if (action === "confirm" && isId(eventId, "sevt")) await confirmTool(id, eventId, allow === true);
    else if (action === "interrupt") await interruptSession(id);
    else return Response.json({ error: "Unknown action" }, { status: 400 });
    return Response.json({ ok: true });
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
