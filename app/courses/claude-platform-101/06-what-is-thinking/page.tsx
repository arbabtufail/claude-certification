import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { ThinkingCompare } from "./ThinkingCompare";
import { RoadTripAgent } from "./RoadTripAgent";

export const metadata = { title: lessonTitle("claude-platform-101", "06-what-is-thinking") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="06-what-is-thinking"
      intro={
        <>
          Thinking lets Claude reason before it answers. On Claude Opus 5 it is <b>adaptive</b> and on by default; you
          set how deep it goes with <code>output_config.effort</code>, and add <code>display: &quot;summarized&quot;</code>{" "}
          to see the reasoning. Settings: <code>lib/courses/claude-platform-101/lesson-06.ts</code>.
        </>
      }
    >
      <h2>1. Answer immediately, or think first?</h2>
      <p className="muted">
        The same question at several thinking settings, side by side. Look at correctness, thinking tokens, time and cost.
        Try the simple classification too: there, thinking only adds cost.
      </p>
      <ThinkingCompare />

      <h2>2. Thinking in action: the road trip agent</h2>
      <p className="muted">
        The lesson&apos;s example: one weather tool, and a trade-off between weather and drive time. Watch the thinking
        summaries appear between the tool calls.
      </p>
      <RoadTripAgent />
    </LessonLayout>
  );
}
