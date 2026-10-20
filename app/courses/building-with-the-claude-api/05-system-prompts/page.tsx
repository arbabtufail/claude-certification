import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { SystemPromptDemo } from "./SystemPromptDemo";

export const metadata = { title: lessonTitle("building-with-the-claude-api", "05-system-prompts") };

export default function Page() {
  return (
    <LessonLayout
      course="building-with-the-claude-api"
      lesson="05-system-prompts"
      intro={
        <>
          A system prompt tells Claude what role to play: tone, style, and what to do and not do. Same question, with and
          without one. Terminal version: <code>npm run api-lesson5</code>.
        </>
      }
    >
      <SystemPromptDemo />
    </LessonLayout>
  );
}
