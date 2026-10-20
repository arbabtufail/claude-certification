// /api/claude-platform-101/lesson-12/setup
//   GET  -> the stored agent + environment (steps 1 and 2)
//   POST -> { step: "agent", model } or { step: "environment", networking } creates that primitive
import { describeError } from "@/lib/claude/errors";
import { LESSON_12_MODELS, NETWORKING, type Networking } from "@/lib/courses/claude-platform-101/lesson-12";
import { createAgent, createEnvironment, getState } from "@/lib/courses/claude-platform-101/lesson-12-server";

export async function GET() {
  return Response.json(await getState());
}

export async function POST(req: Request) {
  const { step, model, networking } = await req.json();
  try {
    if (step === "agent" && LESSON_12_MODELS.includes(model)) return Response.json(await createAgent(model));
    if (step === "environment" && networking in NETWORKING) return Response.json(await createEnvironment(networking as Networking));
    return Response.json({ error: "Unknown step or option" }, { status: 400 });
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
