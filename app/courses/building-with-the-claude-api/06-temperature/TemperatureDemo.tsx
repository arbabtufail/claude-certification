"use client";

import { useState } from "react";
import { COURSE_MODEL, LEGACY_MODELS } from "@/lib/courses/building-with-the-claude-api/capabilities";
import { postChat } from "@/lib/courses/building-with-the-claude-api/client-api";
import {
  MOVIE_PROMPT,
  NEXT_TOKENS,
  TEMPERATURE_RANGES,
  applyTemperature,
} from "@/lib/courses/building-with-the-claude-api/lesson-06";
import { formatUsd } from "@/components/ResultCard";

const RUNS = 3;
type Runs = { temperature: number; replies: (string | null)[] };

function ProbabilityBars({ t }: { t: number }) {
  const probs = applyTemperature(NEXT_TOKENS.map((x) => x.p), t);
  return (
    <div style={{ display: "grid", gap: 4, marginTop: 10 }}>
      {NEXT_TOKENS.map((x, i) => (
        <div key={x.token} style={{ display: "grid", gridTemplateColumns: "72px 1fr 48px", gap: 8, alignItems: "center", fontSize: 13 }}>
          <code>{x.token}</code>
          <div className="progress" style={{ height: 14 }}>
            <div style={{ width: `${probs[i] * 100}%`, transition: "width .15s" }} />
          </div>
          <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(probs[i] * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

export function TemperatureDemo() {
  const [t, setT] = useState(1);
  const [model, setModel] = useState(COURSE_MODEL);
  const [prompt, setPrompt] = useState(MOVIE_PROMPT);
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(1);
  const [results, setResults] = useState<Runs[]>([]);
  const [cost, setCost] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newModelError, setNewModelError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setCost(0);
    const temps = [low, high];
    setResults(temps.map((temperature) => ({ temperature, replies: Array(RUNS).fill(null) })));
    try {
      // RUNS requests at each temperature, all in parallel. Same prompt every time.
      const all = await Promise.all(
        temps.map((temperature) =>
          Promise.all(
            Array.from({ length: RUNS }, () => postChat({ model, temperature, messages: [{ role: "user", content: prompt }] })),
          ),
        ),
      );
      setResults(all.map((rs, i) => ({ temperature: temps[i], replies: rs.map((r) => r.text) })));
      setCost(all.flat().reduce((sum, r) => sum + r.costUsd, 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function tryNewModel() {
    setNewModelError("Sending…");
    try {
      await postChat({ model: "claude-opus-5-5", temperature: 0, messages: [{ role: "user", content: prompt }] });
      setNewModelError("Accepted (unexpected: the API may have changed).");
    } catch (err) {
      setNewModelError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <h2>1. What temperature does to the next token</h2>
      <section className="panel">
        <label className="field" htmlFor="l6-t">
          Temperature: <b>{t.toFixed(2)}</b> <span className="muted">(prompt: &quot;What do you think?&quot;)</span>
        </label>
        <input id="l6-t" type="range" min={0} max={1} step={0.01} value={t} onChange={(e) => setT(Number(e.target.value))} style={{ width: "100%" }} />
        <ProbabilityBars t={t} />
        <p className="muted">
          At 0 the top token always wins. At 1 Claude samples from its own probabilities. An illustration using the
          lesson&apos;s numbers: each probability is raised to 1/T and rescaled.
        </p>
      </section>

      <h2>2. Movie ideas at two temperatures</h2>
      <section className="panel">
        <label className="field" htmlFor="l6-prompt">Prompt</label>
        <input id="l6-prompt" className="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="row">
          <div>
            <label className="field" htmlFor="l6-low">Low temperature</label>
            <input id="l6-low" type="number" min={0} max={1} step={0.1} value={low} onChange={(e) => setLow(Number(e.target.value))} />
          </div>
          <div>
            <label className="field" htmlFor="l6-high">High temperature</label>
            <input id="l6-high" type="number" min={0} max={1} step={0.1} value={high} onChange={(e) => setHigh(Number(e.target.value))} />
          </div>
          <div className="grow">
            <label className="field" htmlFor="l6-model">Model (only these accept temperature)</label>
            <select id="l6-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {LEGACY_MODELS.map((m) => <option key={m} value={m}>{m}{m === COURSE_MODEL ? " (course)" : ""}</option>)}
            </select>
          </div>
          <button className="run" onClick={run} disabled={busy || !prompt.trim()}>
            {busy ? "Generating…" : `Run ${RUNS}× at each temperature`}
          </button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}

      {results.length > 0 && (
        <>
          <div className="compare-grid">
            {results.map((r) => {
              const done = r.replies.filter((x): x is string => x !== null);
              const distinct = new Set(done.map((x) => x.trim())).size;
              return (
                <section key={r.temperature} className="panel">
                  <strong>temperature: {r.temperature}</strong>
                  {done.length === RUNS && (
                    <p className="muted">{distinct} different answer{distinct === 1 ? "" : "s"} out of {RUNS}</p>
                  )}
                  <ol style={{ paddingLeft: 20, display: "grid", gap: 6 }}>
                    {r.replies.map((x, i) => <li key={i}>{x ?? <span className="muted">waiting…</span>}</li>)}
                  </ol>
                </section>
              );
            })}
          </div>
          {cost > 0 && <p className="muted">Cost of these {RUNS * 2} requests: {formatUsd(cost)}</p>}
        </>
      )}

      <h2>Choosing a temperature</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Range</th><th>Level</th><th>Good for</th></tr></thead>
          <tbody>
            {TEMPERATURE_RANGES.map((r) => (
              <tr key={r.range}><td>{r.range}</td><td>{r.label}</td><td className="wrap">{r.uses}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>On today&apos;s models</h2>
      <section className="panel">
        <p style={{ marginTop: 0 }}>
          The course runs on <code>claude-sonnet-4-5</code>. Newer models (Opus 5.5, Sonnet 5.5, Haiku 5.5…) no longer
          accept a temperature other than 1. They return a 400 error, so steer them with the prompt, and the{" "}
          <code>effort</code> setting, instead.
        </p>
        <button className="run secondary" onClick={tryNewModel}>Try temperature 0 on claude-opus-5-5</button>
        {newModelError && <p className={newModelError.startsWith("Bad request") ? "error" : "muted"}>{newModelError}</p>}
      </section>

      <h2>The chat function with temperature</h2>
      <pre>{`async function chat(messages: Anthropic.MessageParam[], system?: string, temperature?: number) {
  const params: Anthropic.MessageCreateParamsNonStreaming = { model, max_tokens: 1000, messages };
  if (system) params.system = system;
  // The course defaults to 1.0. Leaving it out means the same thing, and also works on newer models.
  if (temperature !== undefined) params.temperature = temperature;
  ...
}

await chat(messages, undefined, 0.0); // predictable
await chat(messages, undefined, 1.0); // more varied`}</pre>
    </>
  );
}
