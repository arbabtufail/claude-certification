"use client";

import { useState } from "react";
import {
  ANSWER_STYLES,
  LESSON_6_MODEL,
  LESSON_6_MODELS,
  PUZZLES,
  THINKING_SETTINGS,
  finalAnswer,
  isCorrect,
  type AnswerStyle,
  type ThinkingSetting,
} from "@/lib/courses/claude-platform-101/lesson-06";
import type { SendResult } from "@/lib/claude/send";
import { formatUsd } from "@/components/ResultCard";

type Row = ({ ok: true; setting: ThinkingSetting } & SendResult) | { ok: false; setting: ThinkingSetting; error: string };

const label = (s: ThinkingSetting) => (s === "off" ? "off (answer immediately)" : `adaptive, effort: ${s}`);

export function ThinkingCompare() {
  const [puzzleId, setPuzzleId] = useState(PUZZLES[0].id);
  const [prompt, setPrompt] = useState(PUZZLES[0].prompt);
  const [model, setModel] = useState(LESSON_6_MODEL);
  const [settings, setSettings] = useState<ThinkingSetting[]>(["off", "low", "high"]);
  const [style, setStyle] = useState<AnswerStyle>("instant");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const puzzle = PUZZLES.find((p) => p.id === puzzleId && p.prompt === prompt);
  const modelInfo = LESSON_6_MODELS.find((m) => m.id === model)!;
  const usable = settings.filter((s) => s !== "off" || modelInfo.canDisable);

  function pickPuzzle(id: string) {
    const p = PUZZLES.find((x) => x.id === id)!;
    setPuzzleId(p.id);
    setPrompt(p.prompt);
    setRows(null);
  }

  function toggle(s: ThinkingSetting) {
    setSettings((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function run() {
    setLoading(true);
    setError(null);
    setRows(null);
    try {
      const ordered = THINKING_SETTINGS.filter((s) => usable.includes(s));
      const res = await fetch("/api/claude-platform-101/lesson-06/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, settings: ordered, style }),
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

  return (
    <>
      <section className="panel">
        <div className="tabs">
          {PUZZLES.map((p) => (
            <button key={p.id} className="tab" aria-selected={puzzle?.id === p.id} onClick={() => pickPuzzle(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <label className="field" htmlFor="th-prompt">Question</label>
        <textarea id="th-prompt" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        {puzzle ? (
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Correct answer: <b>{puzzle.expected}</b>
            {puzzle.kind === "simple" && " · A simple task: thinking should add time and cost without changing the answer."}
          </p>
        ) : (
          <p className="muted" style={{ margin: "6px 0 0" }}>Custom question: no automatic check.</p>
        )}

        <fieldset style={{ marginTop: 12 }}>
          <legend className="field">Answer style (system prompt)</legend>
          {(Object.keys(ANSWER_STYLES) as AnswerStyle[]).map((s) => (
            <label key={s} className="radio">
              <input type="radio" name="style" checked={style === s} onChange={() => setStyle(s)} />
              <span><b>{ANSWER_STYLES[s].label}</b> <span className="muted">· {ANSWER_STYLES[s].help}</span></span>
            </label>
          ))}
        </fieldset>

        <div style={{ marginTop: 12 }}>
          <span className="field">Thinking settings to compare</span>
          <div className="checks">
            {THINKING_SETTINGS.map((s) => {
              const blocked = s === "off" && !modelInfo.canDisable;
              return (
                <label key={s} title={blocked ? `${model} always thinks` : undefined} style={blocked ? { opacity: 0.5 } : undefined}>
                  <input type="checkbox" disabled={blocked} checked={settings.includes(s) && !blocked} onChange={() => toggle(s)} />
                  <code>{s}</code>
                </label>
              );
            })}
          </div>
          {!modelInfo.canDisable && <p className="muted" style={{ margin: "6px 0 0" }}>{model} cannot switch thinking off. Use low effort instead.</p>}
        </div>

        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="th-model">Model</label>
            <select id="th-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {LESSON_6_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}{m.id === LESSON_6_MODEL ? " (used in lesson 6)" : ""} · default effort {m.defaultEffort}
                </option>
              ))}
            </select>
          </div>
          <button className="run" onClick={run} disabled={loading || usable.length === 0}>
            {loading ? `Running ${usable.length}…` : `Compare ${usable.length} setting${usable.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}

      {rows && (
        <>
          <section className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thinking</th><th>Answer</th>{puzzle && <th>Correct?</th>}
                  <th className="num">Thinking tok</th><th className="num">Output tok</th>
                  <th className="num">Time</th><th className="num">Cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  if (!r.ok) {
                    return (
                      <tr key={r.setting}>
                        <td><code>{r.setting}</code></td>
                        <td colSpan={puzzle ? 6 : 5} className="error wrap">{r.error}</td>
                      </tr>
                    );
                  }
                  const answer = finalAnswer(r.text) || r.text.slice(0, 80);
                  const correct = puzzle ? isCorrect(puzzle, answer) : null;
                  return (
                    <tr key={r.setting}>
                      <td><code>{r.setting}</code></td>
                      <td className="wrap">{answer}</td>
                      {puzzle && <td className={correct ? "verdict-ok" : "verdict-bad"}>{correct ? "✓ yes" : "✗ no"}</td>}
                      <td className="num">{r.thinkingTokens}</td>
                      <td className="num">{r.outputTokens}</td>
                      <td className="num">{(r.ms / 1000).toFixed(1)}s</td>
                      <td className="num">{formatUsd(r.costUsd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {rows.map((r) =>
            r.ok ? (
              <section key={r.setting} className="panel">
                <div className="result-head">
                  <strong>{label(r.setting)}</strong>
                  <span className="muted">stop_reason: {r.stopReason}</span>
                </div>
                {r.thinkingText ? (
                  <div className="thinking-box">
                    <div className="thinking-label">Thinking (summary)</div>
                    {r.thinkingText}
                  </div>
                ) : (
                  <p className="muted">
                    {r.setting === "off" ? "No thinking: Claude answered immediately." : "Claude decided this needed little or no visible thinking."}
                  </p>
                )}
                <div className="answer">{r.text}</div>
              </section>
            ) : null,
          )}
        </>
      )}
    </>
  );
}
