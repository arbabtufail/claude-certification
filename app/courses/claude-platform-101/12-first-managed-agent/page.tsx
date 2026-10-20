import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { FirstManagedAgent } from "./FirstManagedAgent";

export const metadata = { title: lessonTitle("claude-platform-101", "12-first-managed-agent") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="12-first-managed-agent"
      intro={
        <>
          No while loop: you <b>send events and read events</b>. Four primitives in order: agent, environment, session,
          events. Anthropic runs the loop in its container; you consume the stream. Code:{" "}
          <code>lib/courses/claude-platform-101/lesson-12-server.ts</code>. Terminal version: <code>npm run lesson12</code>.
        </>
      }
    >
      <FirstManagedAgent />
    </LessonLayout>
  );
}
