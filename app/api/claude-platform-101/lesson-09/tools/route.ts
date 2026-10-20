// /api/claude-platform-101/lesson-09/tools
//   GET  -> which presets are usable (is the Linear token configured?)
//   POST -> { server } lists the server's tools directly over MCP (no Claude call, no tokens)
import { listMcpTools } from "@/lib/claude/mcp";
import { linearConfigured, resolveServer } from "@/lib/courses/claude-platform-101/lesson-09-servers";

export async function GET() {
  return Response.json({ linearConfigured: linearConfigured() });
}

export async function POST(req: Request) {
  const { server } = await req.json();
  const resolved = resolveServer(server);
  if ("error" in resolved) return Response.json({ error: resolved.error }, { status: 400 });

  try {
    return Response.json(await listMcpTools(resolved));
  } catch (err) {
    return Response.json({ error: `Could not list tools: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }
}
