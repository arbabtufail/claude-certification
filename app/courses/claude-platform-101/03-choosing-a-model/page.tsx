import { MODELS } from "@/lib/claude/models";
import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { CompareModels } from "./CompareModels";
import { ModelRouter } from "./ModelRouter";

export const metadata = { title: lessonTitle("claude-platform-101", "03-choosing-a-model") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="03-choosing-a-model"
      intro={
        <>
          The right model is the cheapest one whose output you would actually ship. Model list and prices:{" "}
          <code>lib/claude/models.ts</code>. Lesson settings: <code>lib/courses/claude-platform-101/lesson-03.ts</code>.
        </>
      }
    >
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tier</th><th>Model ID</th><th className="num">Input $/1M</th><th className="num">Output $/1M</th><th>Note</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m) => (
              <tr key={m.id}>
                <td>{m.tier}</td>
                <td><code>{m.id}</code></td>
                <td className="num">${m.inputPrice.toFixed(2)}</td>
                <td className="num">${m.outputPrice.toFixed(2)}</td>
                <td className="muted">{m.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2>1. Compare the tiers side by side</h2>
      <p className="muted">
        Same prompt, same max_tokens, only the model changes. Watch latency and <code>response.usage</code>.
      </p>
      <CompareModels />

      <h2>2. Route different work to different models</h2>
      <p className="muted">
        Haiku classifies every document. Client updates go to Sonnet, RFPs go to Opus, and anything else stops after
        classification.
      </p>
      <ModelRouter />
    </LessonLayout>
  );
}
