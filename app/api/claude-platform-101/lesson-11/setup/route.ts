// /api/claude-platform-101/lesson-11/setup
//   GET   -> the stored environment + agent IDs (or null)
//   POST  -> create the environment and agent ONCE (reuses them if they already exist)
//   PATCH -> { model } updates the agent: a new version, not a new agent
import { ensureSetup, getSetup, updateAgentModel } from "@/lib/claude/managed-agents";
import { describeError } from "@/lib/claude/errors";
import { AGENT_DEFINITION, AGENT_MODELS } from "@/lib/courses/claude-platform-101/lesson-11";

const fail = (err: unknown) => {
  const { status, error } = describeError(err);
  return Response.json({ error }, { status });
};

export async function GET() {
  return Response.json({ setup: await getSetup() });
}

export async function POST(req: Request) {
  const { model } = await req.json();
  if (!AGENT_MODELS.includes(model)) return Response.json({ error: "Unknown model" }, { status: 400 });
  try {
    return Response.json({ setup: await ensureSetup({ ...AGENT_DEFINITION, model }) });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: Request) {
  const { model } = await req.json();
  if (!AGENT_MODELS.includes(model)) return Response.json({ error: "Unknown model" }, { status: 400 });
  try {
    return Response.json({ setup: await updateAgentModel(model) });
  } catch (err) {
    return fail(err);
  }
}
