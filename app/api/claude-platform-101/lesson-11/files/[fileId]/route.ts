// GET /api/claude-platform-101/lesson-11/files/[fileId]?name=report.md
// Downloads a deliverable the agent wrote to /mnt/session/outputs/ (via the Files API).
import { downloadOutput } from "@/lib/claude/managed-agents";
import { describeError } from "@/lib/claude/errors";

export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!/^file_[A-Za-z0-9]{6,80}$/.test(fileId)) return Response.json({ error: "Bad file id" }, { status: 400 });
  const name = (new URL(req.url).searchParams.get("name") ?? "output").replace(/[^\w.-]/g, "_");
  try {
    const file = await downloadOutput(fileId);
    const type = file.headers.get("content-type") ?? "application/octet-stream";
    // Show text and images in the browser; HTML is sent as plain text so it can't run scripts on this site.
    const safeType = type.includes("html") ? "text/plain; charset=utf-8" : type;
    return new Response(file.body, { headers: { "Content-Type": safeType, "Content-Disposition": `inline; filename="${name}"` } });
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
