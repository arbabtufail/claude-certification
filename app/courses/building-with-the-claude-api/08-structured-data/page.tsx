import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { StructuredDataDemo } from "./StructuredDataDemo";

export const metadata = { title: lessonTitle("building-with-the-claude-api", "08-structured-data") };

export default function Page() {
  return (
    <LessonLayout
      course="building-with-the-claude-api"
      lesson="08-structured-data"
      intro={
        <>
          Getting just the data, with no code fence or commentary around it. An EventBridge rule generator with a copy
          button. Terminal version: <code>npm run api-lesson8</code>.
        </>
      }
    >
      <StructuredDataDemo />
    </LessonLayout>
  );
}
