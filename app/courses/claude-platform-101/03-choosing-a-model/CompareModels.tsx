"use client";

import { useState } from "react";
import { MODELS, getModel } from "@/lib/claude/models";
import { COMPARE_DEFAULT_MAX_TOKENS, COMPARE_DEFAULT_MODELS, COMPARE_DEFAULT_PROMPT } from "@/lib/courses/claude-platform-101/lesson-03";
import type { SendResult } from "@/lib/claude/send";
import { ResultCard, formatUsd } from "@/components/ResultCard";

type CompareRow = ({ ok: true } & SendResult) | { ok: false; model: string; error: string };

export function CompareModels() {
  const [prompt, setPrompt] = useState(COMPARE_DEFAULT_PROMPT);
  const [maxTokens, setMaxTokens] = useState(COMPARE_DEFAULT_MAX_TOKENS);
  const [selected, setSelected] = useState<string[]>(COMPARE_DEFAULT_MODELS);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CompareRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id]));
  }

  async function run() {
    setLoading(true);
    setError(null);
    setRows(null);
    try {
      // Keep the catalog order (cheapest tier last) regardless of click order.
      const models = MODELS.map((m) => m.id).filter((id) => selected.includes(id));
      const res = await fetch("/api/claude-platform-101/lesson-03/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens, models }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRows(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const succeeded = rows?.filter((r): r is { ok: true } & SendResult => r.ok) ?? [];

  return (
    <>
      <section className="panel">
        <label className="field" htmlFor="cmp-prompt">Prompt</label>
        <textarea id="cmp-prompt" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

        <div style={{ marginTop: 12 }}>
          <span className="field">Models</span>
          <div className="checks">
            {MODELS.map((m) => (
              <label key={m.id}>
                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                <code>{m.id}</code>
              </label>
            ))}
          </div>
        </div>

        <div className="row">
          <div style={{ width: 160 }}>
            <label className="field" htmlFor="cmp-max">max_tokens</label>
            <input id="cmp-max" type="number" min={1} max={8192} value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))} />
          </div>
          <button className="run" onClick={run} disabled={loading || selected.length === 0}>
            {loading ? `Running ${selected.length} models…` : `Run on ${selected.length} model${selected.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}

      {rows && (
        <section className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model</th><th>Tier</th><th className="num">Time</th><th className="num">Input tok</th>
                <th className="num">Output tok</th><th className="num">Cost</th><th>stop_reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) =>
                r.ok ? (
                  <tr key={r.model}>
                    <td><code>{r.model}</code></td>
                    <td>{getModel(r.model)?.tier}</td>
                    <td className="num">{(r.ms / 1000).toFixed(2)}s</td>
                    <td className="num">{r.inputTokens}</td>
                    <td className="num">{r.outputTokens}{r.thinkingTokens > 0 && <span className="muted"> ({r.thinkingTokens} thinking)</span>}</td>
                    <td className="num">{formatUsd(r.costUsd)}</td>
                    <td>{r.stopReason}</td>
                  </tr>
                ) : (
                  <tr key={r.model}>
                    <td><code>{r.model}</code></td>
                    <td colSpan={6} className="error">{r.error}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </section>
      )}

      {succeeded.map((r) => <ResultCard key={r.model} result={r} />)}
    </>
  );
}
