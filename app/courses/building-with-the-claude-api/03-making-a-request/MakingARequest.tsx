"use client";

import { useState } from "react";
import { MODELS } from "@/lib/claude/models";
import {
  LESSON_3_MAX_TOKENS,
  LESSON_3_MODEL,
  LESSON_3_PROMPT,
  MAX_TOKENS_LIMIT,
  type LessonMessage,
} from "@/lib/courses/building-with-the-claude-api/lesson-03";
import type { Lesson3Result } from "@/lib/courses/building-with-the-claude-api/lesson-03-server";
import { ResultCard } from "@/components/ResultCard";

// The TypeScript the page is about to run, rebuilt from the form on every change.
function codeFor(model: string, maxTokens: number, messages: LessonMessage[]) {
  const list = messages
    .map((m) => `    {\n      role: "${m.role}",\n      content: ${JSON.stringify(m.content)},\n    },`)
    .join("\n");
  return `const message = await client.messages.create({
  model: "${model}",
  max_tokens: ${maxTokens},
  messages: [
${list}
  ],
});`;
}

export function MakingARequest() {
  const [model, setModel] = useState(LESSON_3_MODEL);
  const [maxTokens, setMaxTokens] = useState(LESSON_3_MAX_TOKENS);
  const [messages, setMessages] = useState<LessonMessage[]>([{ role: "user", content: LESSON_3_PROMPT }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Lesson3Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const edit = (i: number, content: string) => setMessages((ms) => ms.map((m, j) => (j === i ? { ...m, content } : m)));
  // Add a turn: Claude's (assistant) reply, then your next user message. Keeps roles alternating.
  const addTurn = () =>
    setMessages((ms) => [...ms, { role: "assistant", content: result?.text ?? "" }, { role: "user", content: "" }]);
  const removeTurn = () => setMessages((ms) => (ms.length > 1 ? ms.slice(0, -2) : ms));

  async function send() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/building-with-the-claude-api/lesson-03/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, maxTokens, messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2>1. The three parameters</h2>
      <section className="panel">
        <div className="row" style={{ marginTop: 0 }}>
          <div className="grow">
            <label className="field" htmlFor="l3-model">model: which Claude to use</label>
            <select id="l3-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.id}{m.id === LESSON_3_MODEL ? " (lesson)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field" htmlFor="l3-max">max_tokens: a safety cap, not a target</label>
            <input
              id="l3-max"
              className="text"
              type="number"
              min={1}
              max={MAX_TOKENS_LIMIT}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
            />
          </div>
        </div>
        <p className="muted">
          Try max_tokens = 10: Claude doesn&apos;t shorten its answer to fit. It writes as usual and gets cut off, with{" "}
          <code>stop_reason: &quot;max_tokens&quot;</code>.
        </p>

        <label className="field">messages: the conversation so far</label>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div className="muted">
              role: <b>{m.role}</b> {m.role === "user" ? "(written by you)" : "(what Claude said earlier)"}
            </div>
            <textarea rows={2} value={m.content} onChange={(e) => edit(i, e.target.value)} />
          </div>
        ))}
        <div className="row">
          <button className="run secondary" onClick={addTurn}>+ Add assistant reply and next user message</button>
          {messages.length > 1 && <button className="run secondary" onClick={removeTurn}>Remove last turn</button>}
        </div>
      </section>

      <h2>2. The request</h2>
      <section className="panel">
        <pre style={{ marginTop: 0 }}>{codeFor(model, maxTokens, messages)}</pre>
        <div className="row">
          <button className="run" onClick={send} disabled={loading}>
            {loading ? "Waiting for Claude…" : "Send request"}
          </button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}

      {result && (
        <>
          <h2>3. Extract the response</h2>
          <section className="panel">
            <pre style={{ marginTop: 0 }}>{`const first = message.content[0];   // type: "${result.firstBlockType}"
if (first.type === "text") console.log(first.text);`}</pre>
            {result.firstBlockType !== "text" && (
              <p className="warn">
                content[0] is a <code>{result.firstBlockType}</code> block here, not text: this model thinks before
                answering. Python&apos;s <code>message.content[0].text</code> would fail; the page read the text block instead.
              </p>
            )}
          </section>
          <ResultCard result={result} />
        </>
      )}
    </>
  );
}
