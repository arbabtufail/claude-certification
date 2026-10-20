import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { StreamingDemo } from "./StreamingDemo";

export const metadata = { title: lessonTitle("building-with-the-claude-api", "07-response-streaming") };

export default function Page() {
  return (
    <LessonLayout
      course="building-with-the-claude-api"
      lesson="07-response-streaming"
      intro={
        <>
          Streaming shows the reply as it&apos;s written instead of after a 10-30 second wait. One request, many events.
          Terminal version: <code>npm run api-lesson7</code>.
        </>
      }
    >
      <StreamingDemo />
    </LessonLayout>
  );
}
