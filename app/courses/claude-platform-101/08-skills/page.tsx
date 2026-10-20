import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { SkillsDemo } from "./SkillsDemo";

export const metadata = { title: lessonTitle("claude-platform-101", "08-skills") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="08-skills"
      intro={
        <>
          Tools are about <b>what</b> Claude can do; Skills are about <b>how</b> you want it done. Upload a Skill folder
          once, then attach it to any <code>messages.create</code> call with <code>container.skills</code> plus the code
          execution tool. Skills API: <code>lib/claude/skills.ts</code>. The Skill itself:{" "}
          <code>skills/status-report-generator/</code>.
        </>
      }
    >
      <SkillsDemo />
    </LessonLayout>
  );
}
