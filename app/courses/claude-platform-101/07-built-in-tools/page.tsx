import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { ServerToolsDemo } from "./ServerToolsDemo";

export const metadata = { title: lessonTitle("claude-platform-101", "07-built-in-tools") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="07-built-in-tools"
      intro={
        <>
          Server tools are declared in your <code>tools</code> array and <b>run by Anthropic</b>. There&apos;s no agent
          loop: the <code>server_tool_use</code> call and its result block come back in the same response as the text.
          Request code: <code>lib/claude/server-tools.ts</code>. Tools and samples:{" "}
          <code>lib/courses/claude-platform-101/lesson-07.ts</code>.
        </>
      }
    >
      <ServerToolsDemo />
    </LessonLayout>
  );
}
