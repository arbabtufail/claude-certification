import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { AgentLoopDemo } from "./AgentLoopDemo";

export const metadata = { title: lessonTitle("claude-platform-101", "04-the-agent-loop") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="04-the-agent-loop"
      intro={
        <>
          An agent is Claude in a loop: send messages with <b>tools</b>, run any tool Claude requests, send the{" "}
          <b>tool_result</b> back, and stop when <code>stop_reason</code> is <code>end_turn</code>. The loop is in{" "}
          <code>lib/claude/agent-loop.ts</code>; the tools are in{" "}
          <code>lib/courses/claude-platform-101/lesson-04.ts</code>. Each step streams to this page as it happens.
        </>
      }
    >
      <AgentLoopDemo />
    </LessonLayout>
  );
}
