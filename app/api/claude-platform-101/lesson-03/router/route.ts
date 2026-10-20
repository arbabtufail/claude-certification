// POST /api/claude-platform-101/lesson-03/router
// Lesson 3 "routing different work to different models": one endpoint, several models.
// Step 1: Haiku classifies the document (cheap, fast).
// Step 2: the category decides which model drafts the reply (Sonnet for client updates, Opus for RFPs).
import { sendMessage, type SendResult } from "@/lib/claude/send";
import { describeError } from "@/lib/claude/errors";
import { ROUTER_CLASSIFIER, ROUTES, parseCategory } from "@/lib/courses/claude-platform-101/lesson-03";

export async function POST(req: Request) {
  const { document } = await req.json();
  if (typeof document !== "string" || !document.trim()) {
    return Response.json({ error: "Document is empty" }, { status: 400 });
  }

  try {
    const classify: SendResult = await sendMessage({
      model: ROUTER_CLASSIFIER.model,
      maxTokens: ROUTER_CLASSIFIER.maxTokens,
      system: ROUTER_CLASSIFIER.system,
      prompt: document,
    });
    const category = parseCategory(classify.text);

    const route = ROUTES[category];
    const draft = route
      ? await sendMessage({ model: route.model, maxTokens: route.maxTokens, system: route.system, prompt: document })
      : null;

    return Response.json({ category, classify, draft });
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
