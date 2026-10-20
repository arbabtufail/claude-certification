"use client";

import { useState } from "react";
import { MODELS } from "@/lib/claude/models";
import type { AgentEvent } from "@/lib/claude/agent-loop";
import {
  DESCRIPTION_STYLES,
  LESSON_5_MODEL,
  LESSON_5_SAMPLES,
  MANUAL_LOOP_SNIPPET,
  TOOL_RUNNER_SNIPPET,
  type DescriptionStyle,
} from "@/lib/courses/claude-platform-101/lesson-05";
import { useAgentRun } from "@/lib/client/use-agent-run";
import { AgentTimeline } from "@/components/AgentTimeline";
import { formatUsd } from "@/components/ResultCard";

type Mode = "manual" | "runner";

const MODES: Record<Mode, { label: string; help: string; snippet: string }> = {
  manual: {
    label: "Manual loop",
    help: "Hand-written JSON schemas, a while loop, and a switch on the tool name.",
    snippet: MANUAL_LOOP_SNIPPET,
  },
  runner: {
    label: "Tool runner (beta)",
    help: "betaZodTool + client.beta.messages.toolRunner(): the SDK runs the loop for you.",
    snippet: TOOL_RUNNER_SNIPPET,
  },
};

type HistoryRow = {
  id: number;
  prompt: string;
  mode: Mode;
  descriptions: DescriptionStyle;
  calls: string[][]; // tool calls per turn
  apiCalls: number;
  costUsd: number;
  seconds: number;
  reason: string;
};

function summarise(id: number, prompt: string, mode: Mode, descriptions: DescriptionStyle, events: AgentEvent[]): HistoryRow | null {
  const done = events.find((e) => e.type === "done");
  if (!done || done.type !== "done") return null;
  const calls = events
    .filter((e) => e.type === "response" && e.toolCalls.length > 0)
    .map((e) => (e.type === "response" ? e.toolCalls.map((c) => `${c.name}(${String(c.input.city ?? "")})`) : []));
  return {
    id, prompt, mode, descriptions, calls,
    apiCalls: done.totals.apiCalls,
    costUsd: done.totals.costUsd,
    seconds: done.totals.ms / 1000,
    reason: done.reason ?? "",
  };
}

export function ToolUseDemo() {
  const [prompt, setPrompt] = useState(LESSON_5_SAMPLES[0].prompt);
  const [model, setModel] = useState(LESSON_5_MODEL);
  const [mode, setMode] = useState<Mode>("manual");
  const [descriptions, setDescriptions] = useState<DescriptionStyle>("specific");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const { events, running, error, start, stop } = useAgentRun();

  const sample = LESSON_5_SAMPLES.find((s) => s.prompt === prompt);
  const style = DESCRIPTION_STYLES[descriptions];

  async function run() {
    const runEvents = await start("/api/claude-platform-101/lesson-05/run", { prompt, model, mode, descriptions });
    const row = summarise(Date.now(), prompt, mode, descriptions, runEvents);
    if (row) setHistory((cur) => [row, ...cur]);
  }

  return (
    <>
      <section className="panel">
        <div className="tabs">
          {LESSON_5_SAMPLES.map((s) => (
            <button key={s.label} className="tab" aria-selected={prompt === s.prompt} onClick={() => setPrompt(s.prompt)}>
              {s.label}
            </button>
          ))}
        </div>
        <label className="field" htmlFor="tu-prompt">Prompt</label>
        <textarea id="tu-prompt" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        {sample && <p className="muted" style={{ margin: "6px 0 0" }}>Expect: {sample.expect}</p>}

        <div className="option-grid">
          <fieldset>
            <legend className="field">1. Who runs the loop?</legend>
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <label key={m} className="radio">
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
                <span><b>{MODES[m].label}</b><br /><span className="muted">{MODES[m].help}</span></span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend className="field">2. Tool descriptions</legend>
            {(Object.keys(DESCRIPTION_STYLES) as DescriptionStyle[]).map((d) => (
              <label key={d} className="radio">
                <input type="radio" name="descriptions" checked={descriptions === d} onChange={() => setDescriptions(d)} />
                <span><b>{DESCRIPTION_STYLES[d].label}</b><br /><span className="muted">{DESCRIPTION_STYLES[d].help}</span></span>
              </label>
            ))}
          </fieldset>
        </div>

        <div className="desc-preview">
          <div><code>get_weather</code>: “{style.weather}”</div>
          <div><code>get_forecast</code>: “{style.forecast}”</div>
        </div>

        <details>
          <summary>Code for “{MODES[mode].label}”</summary>
          <pre>{MODES[mode].snippet}</pre>
        </details>

        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="tu-model">Model</label>
            <select id="tu-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.id}{m.id === LESSON_5_MODEL ? " (used in lesson 5)" : ""}</option>
              ))}
            </select>
          </div>
          {running ? (
            <button className="run" onClick={stop}>Stop</button>
          ) : (
            <button className="run" onClick={run}>Run</button>
          )}
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}
      <AgentTimeline events={events} running={running} showJson />

      {history.length > 0 && (
        <>
          <h2>Your runs</h2>
          <p className="muted">Change one setting at a time and compare which tools Claude picked.</p>
          <section className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Prompt</th><th>Loop</th><th>Descriptions</th><th>Tools called (per turn)</th>
                  <th className="num">API calls</th><th className="num">Cost</th><th className="num">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{LESSON_5_SAMPLES.find((s) => s.prompt === h.prompt)?.label ?? "Custom"}</td>
                    <td>{MODES[h.mode].label}</td>
                    <td>{DESCRIPTION_STYLES[h.descriptions].label}</td>
                    <td>
                      {h.calls.length === 0
                        ? <span className="muted">none</span>
                        : h.calls.map((turn, i) => <div key={i}><span className="muted">T{i + 1}:</span> <code>{turn.join(", ")}</code></div>)}
                    </td>
                    <td className="num">{h.apiCalls}</td>
                    <td className="num">{formatUsd(h.costUsd)}</td>
                    <td className="num">{h.seconds.toFixed(1)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}
