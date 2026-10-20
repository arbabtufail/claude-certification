"use client";

import { useState } from "react";
import { MODELS } from "@/lib/claude/models";
import { LESSON_2_MODEL, LESSON_2_TASKS, type Lesson2TaskId } from "@/lib/courses/claude-platform-101/lesson-02";
import type { SendResult } from "@/lib/claude/send";
import { ResultCard } from "@/components/ResultCard";

export function FirstCallDemo() {
  const [task, setTask] = useState<Lesson2TaskId>("review");
  const [input, setInput] = useState(LESSON_2_TASKS.review.sample);
  const [system, setSystem] = useState(LESSON_2_TASKS.review.system);
  const [model, setModel] = useState(LESSON_2_MODEL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function switchTask(id: Lesson2TaskId) {
    setTask(id);
    setInput(LESSON_2_TASKS[id].sample);
    setSystem(LESSON_2_TASKS[id].system);
    setResult(null);
    setError(null);
  }

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/claude-platform-101/lesson-02/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, input, model, system }),
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
      <div className="tabs" role="tablist">
        {(Object.keys(LESSON_2_TASKS) as Lesson2TaskId[]).map((id) => (
          <button key={id} className="tab" role="tab" aria-selected={task === id} onClick={() => switchTask(id)}>
            {LESSON_2_TASKS[id].label}
          </button>
        ))}
      </div>

      <section className="panel">
        <label className="field" htmlFor="input">{LESSON_2_TASKS[task].inputLabel}</label>
        <textarea id="input" rows={8} value={input} onChange={(e) => setInput(e.target.value)} />

        <details>
          <summary>System prompt (sets the persona)</summary>
          <textarea rows={3} style={{ marginTop: 8 }} value={system} onChange={(e) => setSystem(e.target.value)} />
        </details>

        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="model">Model</label>
            <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.id}{m.note ? ` (${m.note})` : ""}</option>
              ))}
            </select>
          </div>
          <button className="run" onClick={run} disabled={loading}>
            {loading ? "Waiting for Claude…" : "Send to Claude"}
          </button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}
      {result && <ResultCard result={result} />}
    </>
  );
}
