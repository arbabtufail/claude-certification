import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { MakingARequest } from "./MakingARequest";

export const metadata = { title: lessonTitle("building-with-the-claude-api", "03-making-a-request") };

export default function Page() {
  return (
    <LessonLayout
      course="building-with-the-claude-api"
      lesson="03-making-a-request"
      intro={
        <>
          The lesson in TypeScript instead of Python. <code>client.messages.create</code> needs three things:{" "}
          <b>model</b>, <b>max_tokens</b> and <b>messages</b>. Code:{" "}
          <code>lib/courses/building-with-the-claude-api/lesson-03-server.ts</code>. Terminal version:{" "}
          <code>npm run api-lesson3</code>.
        </>
      }
    >
      <MakingARequest />
    </LessonLayout>
  );
}
