import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { TemperatureDemo } from "./TemperatureDemo";

export const metadata = { title: lessonTitle("building-with-the-claude-api", "06-temperature") };

export default function Page() {
  return (
    <LessonLayout
      course="building-with-the-claude-api"
      lesson="06-temperature"
      intro={
        <>
          Temperature (0 to 1) controls how predictable or varied Claude&apos;s word choices are. Terminal version:{" "}
          <code>npm run api-lesson6</code>.
        </>
      }
    >
      <TemperatureDemo />
    </LessonLayout>
  );
}
