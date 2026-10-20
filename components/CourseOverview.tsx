// Lists one course's lessons from the registry. Used by app/courses/<course-slug>/page.tsx.
import Link from "next/link";
import { getCourse, lessonHref, type LessonStatus } from "@/lib/courses";

const STATUS_LABEL: Record<LessonStatus, string> = {
  ready: "Practice",
  concept: "Concept only",
  planned: "Not built yet",
};

export function CourseOverview({ course: courseSlug }: { course: string }) {
  const course = getCourse(courseSlug);
  const ready = course.lessons.filter((l) => l.status === "ready").length;

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Courses</Link>
        <span>/</span>
        <span>{course.title}</span>
      </nav>

      <h1>{course.title}</h1>
      <p className="sub">{course.description}</p>
      <p className="muted">
        {ready} practice lesson{ready === 1 ? "" : "s"} built · {course.totalLessons} lessons in the course
      </p>

      <ul className="card-list">
        {course.lessons.map((l) => {
          const body = (
            <div className={`panel lesson-card${l.status === "ready" ? "" : " disabled"}`}>
              <div className="card-head">
                <strong>Lesson {l.number}: {l.title}</strong>
                <span className={`status status-${l.status}`}>{STATUS_LABEL[l.status]}</span>
              </div>
              <div className="muted">{l.summary}</div>
            </div>
          );
          return (
            <li key={l.slug}>
              {l.status === "ready" ? <Link href={lessonHref(course.slug, l.slug)}>{body}</Link> : body}
            </li>
          );
        })}
      </ul>
    </>
  );
}
