// COURSE REGISTRY
// Every course and lesson in the app is listed here. The home page, course pages,
// breadcrumbs and previous/next links are all built from this list.
//
// To add a lesson:  1. add an entry below with status "ready"
//                   2. create app/courses/<course-slug>/<lesson-slug>/page.tsx
// To add a course:  1. add a course object below
//                   2. create app/courses/<course-slug>/page.tsx (copy an existing one)

export type LessonStatus =
  | "ready" // has a practice page
  | "concept" // reading-only lesson, nothing to run
  | "planned"; // not built yet

export type Lesson = {
  number: number;
  slug: string;
  title: string;
  summary: string;
  status: LessonStatus;
};

export type Course = {
  slug: string;
  title: string;
  description: string;
  totalLessons: number;
  lessons: Lesson[];
};

export const COURSES: Course[] = [
  {
    slug: "claude-platform-101",
    title: "Claude Platform 101",
    description: "Build with the Claude API: your first call, choosing models, the agent loop and more.",
    totalLessons: 13,
    lessons: [
      {
        number: 1,
        slug: "01-what-is-the-claude-platform",
        title: "What is the Claude Platform?",
        summary: "Overview of the platform. Nothing to run.",
        status: "concept",
      },
      {
        number: 2,
        slug: "02-first-api-call",
        title: "Your first API call",
        summary: "messages.create with a model, max_tokens, a system prompt and messages. Code review and meeting summary.",
        status: "ready",
      },
      {
        number: 3,
        slug: "03-choosing-a-model",
        title: "Choosing the right model",
        summary: "Compare tiers side by side on latency, tokens and cost, then route different work to different models.",
        status: "ready",
      },
      {
        number: 4,
        slug: "04-the-agent-loop",
        title: "The agent loop explained",
        summary: "Claude in a loop: call tools, read the results, repeat until end_turn. Each step streams live to the page.",
        status: "ready",
      },
      {
        number: 5,
        slug: "05-what-is-tool-use",
        title: "What is tool use?",
        summary: "Two tools, Claude picks. Run the loop yourself or with the SDK tool runner, and see why tool descriptions matter.",
        status: "ready",
      },
      {
        number: 6,
        slug: "06-what-is-thinking",
        title: "What is thinking?",
        summary: "Thinking off vs adaptive at each effort level, side by side, then a road trip agent that shows its reasoning.",
        status: "ready",
      },
      {
        number: 7,
        slug: "07-built-in-tools",
        title: "Built-in tools",
        summary: "Web search, code execution and web fetch: declared by you, run by Anthropic, no agent loop. Plus client tools.",
        status: "ready",
      },
      {
        number: 8,
        slug: "08-skills",
        title: "Skills",
        summary: "Upload a status-report Skill once, attach it with container.skills, and compare the output with and without it.",
        status: "ready",
      },
      {
        number: 9,
        slug: "09-mcp",
        title: "MCP",
        summary: "Connect Claude to a remote MCP server, let it discover the tools, and scope access down to an allowlist.",
        status: "ready",
      },
      {
        number: 10,
        slug: "10-context-management",
        title: "Context management",
        summary: "All four patterns, measured: just-in-time context, server-side compaction, prompt caching, and the memory tool.",
        status: "ready",
      },
      {
        number: 11,
        slug: "11-what-are-managed-agents",
        title: "What are managed agents?",
        summary: "A Kanban board on Managed Agents: each ticket is a session in its own container, graded against a rubric until done.",
        status: "ready",
      },
      {
        number: 12,
        slug: "12-first-managed-agent",
        title: "Building your first managed agent",
        summary: "The four primitives step by step: create an agent and environment once, then run sessions and stream their events.",
        status: "ready",
      },
    ],
  },
  {
    slug: "building-with-the-claude-api",
    title: "Building with the Claude API",
    description: "The full API course, done in TypeScript instead of the course's Python notebooks.",
    totalLessons: 67,
    lessons: [
      {
        number: 2,
        slug: "02-getting-an-api-key",
        title: "Getting an API key",
        summary: "Create a key in the Console. Here it lives in .env.local. Nothing to run.",
        status: "concept",
      },
      {
        number: 3,
        slug: "03-making-a-request",
        title: "Making a request",
        summary: "client.messages.create with model, max_tokens and messages, then read message.content[0].text.",
        status: "ready",
      },
      {
        number: 4,
        slug: "04-multi-turn-conversations",
        title: "Multi-Turn conversations",
        summary: "Claude remembers nothing. The same follow-up, with and without the message history, side by side.",
        status: "ready",
      },
      {
        number: 5,
        slug: "05-system-prompts",
        title: "System prompts",
        summary: "The math tutor: the same question with and without a system prompt, then keep tutoring.",
        status: "ready",
      },
      {
        number: 6,
        slug: "06-temperature",
        title: "Temperature",
        summary: "A probability slider, then movie ideas at temperature 0 vs 1. Plus why newer models reject it.",
        status: "ready",
      },
      {
        number: 7,
        slug: "07-response-streaming",
        title: "Response streaming",
        summary: "Watch every stream event arrive, see the text build up, and compare against waiting for the whole reply.",
        status: "ready",
      },
      {
        number: 8,
        slug: "08-structured-data",
        title: "Structured data",
        summary: "An EventBridge rule generator: prefill + stop sequences as in the lesson, and structured outputs on new models.",
        status: "ready",
      },
    ],
  },
];

export function getCourse(courseSlug: string): Course {
  const course = COURSES.find((c) => c.slug === courseSlug);
  if (!course) throw new Error(`Unknown course: ${courseSlug}`);
  return course;
}

export function getLesson(courseSlug: string, lessonSlug: string): { course: Course; lesson: Lesson } {
  const course = getCourse(courseSlug);
  const lesson = course.lessons.find((l) => l.slug === lessonSlug);
  if (!lesson) throw new Error(`Unknown lesson: ${courseSlug}/${lessonSlug}`);
  return { course, lesson };
}

export const courseHref = (courseSlug: string) => `/courses/${courseSlug}`;
export const lessonHref = (courseSlug: string, lessonSlug: string) => `/courses/${courseSlug}/${lessonSlug}`;

// Previous/next only step between lessons that have a practice page.
export function neighbours(courseSlug: string, lessonSlug: string): { prev?: Lesson; next?: Lesson } {
  const ready = getCourse(courseSlug).lessons.filter((l) => l.status === "ready");
  const i = ready.findIndex((l) => l.slug === lessonSlug);
  return { prev: ready[i - 1], next: ready[i + 1] };
}

export function lessonTitle(courseSlug: string, lessonSlug: string): string {
  const { course, lesson } = getLesson(courseSlug, lessonSlug);
  return `Lesson ${lesson.number}: ${lesson.title} · ${course.title}`;
}
