// POST /api/claude-platform-101/lesson-11/sessions  { ticketId }
// Moving a ticket to "In progress": create a session and send the ticket's outcome (description + rubric).
import { startOutcomeSession } from "@/lib/claude/managed-agents";
import { describeError } from "@/lib/claude/errors";
import { MAX_ITERATIONS, SESSION_BUDGET_CENTS, ticketById } from "@/lib/courses/claude-platform-101/lesson-11";

export async function POST(req: Request) {
  const { ticketId } = await req.json();
  const ticket = ticketById(ticketId);
  if (!ticket) return Response.json({ error: "Unknown ticket" }, { status: 400 });
  try {
    const sessionId = await startOutcomeSession({
      title: `Kanban: ${ticket.title}`,
      description: ticket.description,
      rubric: ticket.rubric,
      maxIterations: MAX_ITERATIONS,
      budgetCents: SESSION_BUDGET_CENTS,
    });
    return Response.json({ sessionId });
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
