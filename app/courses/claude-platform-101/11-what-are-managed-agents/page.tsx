import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { KanbanBoard } from "./KanbanBoard";

export const metadata = { title: lessonTitle("claude-platform-101", "11-what-are-managed-agents") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="11-what-are-managed-agents"
      intro={
        <>
          The same agent loop you wrote in lesson 4, <b>hosted by Anthropic</b>: each session gets its own container with
          bash and a file system. You define what done looks like; a separate grader checks it and Claude iterates. This is
          the lesson&apos;s Kanban example, small enough to run. Code: <code>lib/claude/managed-agents.ts</code>. Tickets:{" "}
          <code>lib/courses/claude-platform-101/lesson-11.ts</code>.
        </>
      }
    >
      <KanbanBoard />
    </LessonLayout>
  );
}
