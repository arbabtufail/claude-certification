// Wraps every lesson page: breadcrumb, title, intro, then the lesson content and previous/next links.
import Link from "next/link";
import { courseHref, getLesson, lessonHref, neighbours } from "@/lib/courses";

type Props = {
  course: string;
  lesson: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
};

export function LessonLayout({ course: courseSlug, lesson: lessonSlug, intro, children }: Props) {
  const { course, lesson } = getLesson(courseSlug, lessonSlug);
  const { prev, next } = neighbours(courseSlug, lessonSlug);

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Courses</Link>
        <span>/</span>
        <Link href={courseHref(courseSlug)}>{course.title}</Link>
        <span>/</span>
        <span>Lesson {lesson.number}</span>
      </nav>

      <h1>Lesson {lesson.number}: {lesson.title}</h1>
      {intro && <p className="sub">{intro}</p>}

      {children}

      <nav className="lesson-nav" aria-label="Lesson navigation">
        {prev ? (
          <Link href={lessonHref(courseSlug, prev.slug)}>← Lesson {prev.number}: {prev.title}</Link>
        ) : (
          <Link href={courseHref(courseSlug)}>← {course.title}</Link>
        )}
        {next ? (
          <Link href={lessonHref(courseSlug, next.slug)}>Lesson {next.number}: {next.title} →</Link>
        ) : (
          <Link href={courseHref(courseSlug)}>All lessons →</Link>
        )}
      </nav>
    </>
  );
}
