// Wraps every page of this course, so the tutor chatbot appears on all of them and keeps its
// conversation while you move between lessons.
import { CourseTutor } from "./CourseTutor";

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CourseTutor />
    </>
  );
}
