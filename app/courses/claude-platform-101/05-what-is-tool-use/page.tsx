import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { ToolUseDemo } from "./ToolUseDemo";

export const metadata = { title: lessonTitle("claude-platform-101", "05-what-is-tool-use") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="05-what-is-tool-use"
      intro={
        <>
          A tool is a function you define and expose. Claude reads the <b>description</b> and decides when to call it;{" "}
          <b>your code executes it</b>. Run the same task with your own loop or with the SDK&apos;s tool runner, and try
          vague or misleading descriptions to see why they matter. Tools: <code>lib/courses/claude-platform-101/lesson-05-tools.ts</code>.
          Runner: <code>lib/claude/tool-runner.ts</code>.
        </>
      }
    >
      <ToolUseDemo />
    </LessonLayout>
  );
}
