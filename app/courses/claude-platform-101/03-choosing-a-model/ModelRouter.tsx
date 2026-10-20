"use client";

import { useState } from "react";
import { ROUTER_SAMPLES, type DocCategory } from "@/lib/courses/claude-platform-101/lesson-03";
import type { SendResult } from "@/lib/claude/send";
import { ResultCard, formatUsd } from "@/components/ResultCard";

type RouterResponse = { category: DocCategory; classify: SendResult; draft: SendResult | null };

export function ModelRouter() {
  const [doc, setDoc] = useState(ROUTER_SAMPLES[0].text);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RouterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/claude-platform-101/lesson-03/router", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: doc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const total = data ? data.classify.costUsd + (data.draft?.costUsd ?? 0) : 0;

  return (
    <>
      <section className="panel">
        <div className="tabs">
          {ROUTER_SAMPLES.map((s) => (
            <button key={s.label} className="tab" aria-selected={doc === s.text} onClick={() => setDoc(s.text)}>
              Sample: {s.label}
            </button>
          ))}
        </div>
        <label className="field" htmlFor="router-doc">Incoming document</label>
        <textarea id="router-doc" rows={5} value={doc} onChange={(e) => setDoc(e.target.value)} />
        <div className="row">
          <button className="run" onClick={run} disabled={loading}>
            {loading ? "Routing…" : "Classify and route"}
          </button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}

      {data && (
        <div className="pipeline">
          <div>
            <div className="step-label">Step 1: classify with Haiku</div>
            <ResultCard result={data.classify} title={`${data.classify.model} → ${data.category}`} />
          </div>
          <div>
            <div className="step-label">Step 2: draft</div>
            {data.draft ? (
              <ResultCard result={data.draft} />
            ) : (
              <section className="panel muted">Category &quot;other&quot;: no drafting model needed, so the pipeline stops here.</section>
            )}
          </div>
          <p className="muted">Total cost for this document: <b>{formatUsd(total)}</b></p>
        </div>
      )}
    </>
  );
}
