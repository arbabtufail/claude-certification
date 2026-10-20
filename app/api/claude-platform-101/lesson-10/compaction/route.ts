// POST /api/claude-platform-101/lesson-10/compaction
// Pattern 2: a ~77k-token conversation crosses the 50k trigger, gets compacted, then a follow-up runs on the summary.
import { describeError } from "@/lib/claude/errors";
import { COMPACTION_MODELS } from "@/lib/courses/claude-platform-101/lesson-10";
import { runCompaction } from "@/lib/courses/claude-platform-101/lesson-10-server";

export async function POST(req: Request) {
  const { model } = await req.json();
  if (!COMPACTION_MODELS.includes(model)) return Response.json({ error: "Pick one of the compaction models" }, { status: 400 });
  try {
    return Response.json(await runCompaction(model));
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
