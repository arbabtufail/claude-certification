import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { MultiTurnDemo } from "./MultiTurnDemo";

export const metadata = { title: lessonTitle("building-with-the-claude-api", "04-multi-turn-conversations") };

export default function Page() {
  return (
    <LessonLayout
      course="building-with-the-claude-api"
      lesson="04-multi-turn-conversations"
      intro={
        <>
          Claude stores <b>no</b> conversation history. To hold a conversation, keep the messages list yourself and send
          all of it on every request. Terminal version: <code>npm run api-lesson4</code>.
        </>
      }
    >
      <MultiTurnDemo />
    </LessonLayout>
  );
}
