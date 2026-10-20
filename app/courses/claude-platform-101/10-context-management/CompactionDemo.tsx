"use client";

import { useState } from "react";
import { COMPACTION_MODELS, COMPACTION_QUESTIONS, COMPACTION_TRIGGER, SNIPPETS } from "@/lib/courses/claude-platform-101/lesson-10";
import { formatUsd } from "@/components/ResultCard";

type Call = {
  sentMessages: number;
  inputTokens: number;
  outputTokens: number;
  iterations: { type?: string; input_tokens?: number; output_tokens?: number }[];
  compacted: boolean;
  compactionSummary: string | null;
  blockTypes: string[];
  answer: string;
  costUsd: number;
  ms: number;
};
type Result = { trigger: number; first: Call; followUp: Call };

export function CompactionDemo() {
  const [model, setModel] = useState(COMPACTION_MODELS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/claude-platform-101/lesson-10/compaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
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

  const call = (title: string, question: string, c: Call) => (
    <section className="panel">
      <div className="result-head">
        <strong>{title}</strong>
        {c.compacted && <span className="pill pill-end_turn">compaction happened</span>}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>“{question}”</p>
      <div className="meta">
        <span>messages sent: <b>{c.sentMessages}</b></span>
        <span>input tokens: <b>{c.inputTokens.toLocaleString()}</b></span>
        <span>output: <b>{c.outputTokens.toLocaleString()}</b></span>
        <span>cost: <b>{formatUsd(c.costUsd)}</b></span>
        <span>time: <b>{(c.ms / 1000).toFixed(1)}s</b></span>
      </div>
      <p className="muted">Blocks: {c.blockTypes.map((t, i) => <code key={i} className="chip">{t}</code>)}</p>
      {c.iterations.length > 0 && (
        <p className="muted">
          usage.iterations: {c.iterations.map((it, i) => (
            <code key={i} className="chip">{it.type ?? "step"}: {it.input_tokens?.toLocaleString()} in / {it.output_tokens?.toLocaleString()} out</code>
          ))}
        </p>
      )}
      {c.compactionSummary && (
        <details open>
          <summary>The compaction block: Claude&apos;s summary of the earlier turns</summary>
          <div className="thinking-box">{c.compactionSummary}</div>
        </details>
      )}
      <div className="answer">{c.answer}</div>
    </section>
  );

  return (
    <>
      <section className="panel">
        <p className="muted" style={{ marginTop: 0 }}>
          The conversation holds a ~77k-token project log, sent in 6 parts. The trigger is set to{" "}
          <b>{COMPACTION_TRIGGER.toLocaleString()}</b> input tokens (the API&apos;s minimum; the default is 150,000), so the
          first question crosses it. The log hides three facts (a database decision, a launch date change, a new risk):
          the follow-up checks whether they survived the summary.
        </p>
        <details><summary>The request</summary><pre>{SNIPPETS.compaction}</pre></details>
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="cmp-model">Model</label>
            <select id="cmp-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {COMPACTION_MODELS.map((m) => (
                <option key={m} value={m}>{m === "claude-haiku-5-5" ? `${m} (cheap: about $0.02 per run)` : `${m} (lesson model: about $1 per run)`}</option>
              ))}
            </select>
          </div>
          <button className="run" onClick={run} disabled={loading}>{loading ? "Sending ~77k tokens…" : "Run the long conversation"}</button>
        </div>
      </section>
      {error && <section className="panel error">{error}</section>}
      {result && (
        <>
          {call("Call 1: the long conversation", COMPACTION_QUESTIONS.first, result.first)}
          {call("Call 2: follow-up (history now starts from the compaction block)", COMPACTION_QUESTIONS.followUp, result.followUp)}
        </>
      )}
    </>
  );
}
