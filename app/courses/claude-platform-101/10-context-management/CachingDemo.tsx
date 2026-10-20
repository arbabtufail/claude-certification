"use client";

import { useState } from "react";
import { LESSON_10_MODEL, LESSON_10_MODELS, SNIPPETS } from "@/lib/courses/claude-platform-101/lesson-10";
import { formatUsd } from "@/components/ResultCard";

type Call = {
  question: string;
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  costUsd: number;
  costIfUncachedUsd: number;
  ms: number;
  answer: string;
};
type Run = { useCache: boolean; model: string; calls: Call[] };

export function CachingDemo() {
  const [model, setModel] = useState(LESSON_10_MODEL);
  const [loading, setLoading] = useState<null | "cache" | "nocache">(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run(useCache: boolean) {
    setLoading(useCache ? "cache" : "nocache");
    setError(null);
    try {
      const res = await fetch("/api/claude-platform-101/lesson-10/caching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, useCache }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRuns((cur) => [{ useCache, model, calls: data.calls }, ...cur]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <section className="panel">
        <p className="muted" style={{ marginTop: 0 }}>
          Three different questions in a row, all with the same big system prompt (the whole code book). With{" "}
          <code>cache_control</code>, call 1 <b>writes</b> the prefix to the cache and calls 2 and 3 <b>read</b> it.
          The cache lives about 5 minutes; run “with cache” twice quickly and even call 1 becomes a read.
        </p>
        <details><summary>The request</summary><pre>{SNIPPETS.caching}</pre></details>
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="cache-model">Model</label>
            <select id="cache-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {LESSON_10_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button className="run" onClick={() => run(true)} disabled={!!loading}>{loading === "cache" ? "Running…" : "Run 3 calls WITH cache"}</button>
          <button className="run secondary" onClick={() => run(false)} disabled={!!loading}>{loading === "nocache" ? "Running…" : "Run 3 calls without cache"}</button>
        </div>
      </section>
      {error && <section className="panel error">{error}</section>}

      {runs.map((r, ri) => {
        const total = r.calls.reduce((n, c) => n + c.costUsd, 0);
        const uncached = r.calls.reduce((n, c) => n + c.costIfUncachedUsd, 0);
        return (
          <section key={ri} className="panel table-wrap">
            <div className="result-head">
              <strong>{r.useCache ? "With cache_control" : "Without caching"} · {r.model}</strong>
              <span className="muted">
                total {formatUsd(total)}
                {r.useCache && uncached > total && ` · would be ${formatUsd(uncached)} without cache (${Math.round((1 - total / uncached) * 100)}% saved)`}
              </span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Call</th><th className="num">Uncached input</th><th className="num">Cache write</th><th className="num">Cache read</th>
                  <th className="num">Output</th><th className="num">Time</th><th className="num">Cost</th>
                </tr>
              </thead>
              <tbody>
                {r.calls.map((c, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="num">{c.inputTokens.toLocaleString()}</td>
                    <td className="num">{c.cacheWriteTokens.toLocaleString()}</td>
                    <td className="num">{c.cacheReadTokens.toLocaleString()}</td>
                    <td className="num">{c.outputTokens.toLocaleString()}</td>
                    <td className="num">{(c.ms / 1000).toFixed(1)}s</td>
                    <td className="num">{formatUsd(c.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details>
              <summary>Answers</summary>
              {r.calls.map((c, i) => <div key={i} className="answer" style={{ marginTop: 8 }}><b>{i + 1}. {c.question}</b>{"\n"}{c.answer}</div>)}
            </details>
          </section>
        );
      })}
    </>
  );
}
