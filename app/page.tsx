import Link from "next/link";
import { COURSES, courseHref } from "@/lib/courses";

export default function Home() {
  // Server component: this runs on the server, so it can check the key without exposing it.
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <>
      <h1>Courses</h1>
      <p className="sub">Hands-on practice for Claude courses. Every practice page calls the real Claude API with your key.</p>

      <p className={hasKey ? "muted" : "error"}>
        API key: {hasKey ? "found" : "missing. Add ANTHROPIC_API_KEY to .env.local and restart npm run dev."}
      </p>

      <ul className="card-list course-grid">
        {COURSES.map((c) => {
          const ready = c.lessons.filter((l) => l.status === "ready").length;
          return (
            <li key={c.slug}>
              <Link href={courseHref(c.slug)}>
                <div className="panel course-card">
                  <strong>{c.title}</strong>
                  <div className="muted">{c.description}</div>
                  <div className="progress" aria-label={`${ready} of ${c.totalLessons} lessons built`}>
                    <div style={{ width: `${(ready / c.totalLessons) * 100}%` }} />
                  </div>
                  <div className="muted">{ready} of {c.totalLessons} lessons built</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
