import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { FirstCallDemo } from "./FirstCallDemo";

export const metadata = { title: lessonTitle("claude-platform-101", "02-first-api-call") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="02-first-api-call"
      intro={
        <>
          One <code>client.messages.create()</code> call with a <b>model</b>, a <b>max_tokens</b> limit, a <b>system</b>{" "}
          prompt for the persona, and a list of <b>messages</b>. The request code is in <code>lib/claude/send.ts</code>;
          the prompts are in <code>lib/courses/claude-platform-101/lesson-02.ts</code>.
        </>
      }
    >
      <FirstCallDemo />
    </LessonLayout>
  );
}
