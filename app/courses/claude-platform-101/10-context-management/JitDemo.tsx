"use client";

import { useState } from "react";
import { CODE_QUESTIONS, LESSON_10_MODEL, LESSON_10_MODELS, SNIPPETS } from "@/lib/courses/claude-platform-101/lesson-10";
import { formatUsd } from "@/components/ResultCard";

type Side = { text: string; inputTokens: number; outputTokens: number; costUsd: number; ms: number; apiCalls: number; calls?: string[]; perCallInput?: number[] };
type Result = { upfront: Side; jit: Side };

export function JitDemo() {
  const [question, setQuestion] = useState(CODE_QUESTIONS[0]);
  const [model, setModel] = useState(LESSON_10_MODEL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/claude-platform-101/lesson-10/jit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const side = (title: string, s: Side, note: string) => (
    <section className="panel">
      <div className="result-head"><strong>{title}</strong></div>
      <div className="meta">
        <span>API calls: <b>{s.apiCalls}</b></span>
        <span>input tokens: <b>{s.inputTokens.toLocaleString()}</b></span>
        <span>output: <b>{s.outputTokens.toLocaleString()}</b></span>
        <span>cost: <b>{formatUsd(s.costUsd)}</b></span>
        <span>time: <b>{(s.ms / 1000).toFixed(1)}s</b></span>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>{note}</p>
      {s.calls && s.calls.length > 0 && (
        <p className="muted">Tools called: {s.calls.map((c, i) => <code key={i} className="chip">{c}</code>)}</p>
      )}
      {s.perCallInput && <p className="muted">Input tokens per call: {s.perCallInput.map((n) => n.toLocaleString()).join(" → ")}</p>}
      <div className="answer">{s.text}</div>
    </section>
  );

  return (
    <>
      <section className="panel">
        <p className="muted" style={{ marginTop: 0 }}>
          A fictional building code book with 120 sections. <b>Upfront</b> puts the whole book in the system prompt.{" "}
          <b>Just in time</b> gives Claude a short prompt plus search and lookup tools, so it reads only what it needs.
        </p>
        <div className="tabs">
          {CODE_QUESTIONS.map((q, i) => (
            <button key={i} className="tab" aria-selected={question === q} onClick={() => setQuestion(q)}>Question {i + 1}</button>
          ))}
        </div>
        <textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} />
        <details><summary>The two designs in code</summary><pre>{SNIPPETS.jit}</pre></details>
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="jit-model">Model</label>
            <select id="jit-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {LESSON_10_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button className="run" onClick={run} disabled={loading}>{loading ? "Running both…" : "Compare both designs"}</button>
        </div>
      </section>
      {error && <section className="panel error">{error}</section>}
      {result && (
        <div className="compare-grid">
          {side("Everything upfront", result.upfront, "One call, but the whole book is input every time.")}
          {side("Just in time (tools)", result.jit, "More calls, each small: only the sections Claude asked for.")}
        </div>
      )}
    </>
  );
}
