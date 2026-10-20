import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { ContextDemo } from "./ContextDemo";

export const metadata = { title: lessonTitle("claude-platform-101", "10-context-management") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="10-context-management"
      intro={
        <>
          Context is everything Claude sees on a turn: system prompt, history, tools, files, thinking. You pay for it on
          every call, and once the window is full the request fails. Four patterns keep the <b>right</b> things in.
          Demos: <code>lib/courses/claude-platform-101/lesson-10-server.ts</code>. Memory storage:{" "}
          <code>lib/claude/memory-store.ts</code>.
        </>
      }
    >
      <ContextDemo />
    </LessonLayout>
  );
}
