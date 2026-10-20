"use client";

import { useState } from "react";
import {
  LESSON_6_MODEL,
  LESSON_6_MODELS,
  LESSON_6_SNIPPET,
  ROAD_TRIP_PROMPT,
  THINKING_SETTINGS,
  type ThinkingSetting,
} from "@/lib/courses/claude-platform-101/lesson-06";
import { useAgentRun } from "@/lib/client/use-agent-run";
import { AgentTimeline } from "@/components/AgentTimeline";

export function RoadTripAgent() {
  const [prompt, setPrompt] = useState(ROAD_TRIP_PROMPT);
  const [model, setModel] = useState(LESSON_6_MODEL);
  const [setting, setSetting] = useState<ThinkingSetting>("high");
  const [display, setDisplay] = useState<"summarized" | "omitted">("summarized");
  const { events, running, error, start, stop } = useAgentRun();

  const modelInfo = LESSON_6_MODELS.find((m) => m.id === model)!;
  const effectiveSetting = setting === "off" && !modelInfo.canDisable ? "low" : setting;

  const run = () =>
    start("/api/claude-platform-101/lesson-06/agent", { prompt, model, setting: effectiveSetting, display });

  return (
    <>
      <section className="panel">
        <label className="field" htmlFor="rt-prompt">Task</label>
        <textarea id="rt-prompt" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

        <div className="option-grid">
          <div>
            <label className="field" htmlFor="rt-model">Model</label>
            <select id="rt-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {LESSON_6_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.id}{m.id === LESSON_6_MODEL ? " (used in lesson 6)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field" htmlFor="rt-setting">Thinking (effort goes in output_config)</label>
            <select id="rt-setting" value={effectiveSetting} onChange={(e) => setSetting(e.target.value as ThinkingSetting)}>
              {THINKING_SETTINGS.map((s) => (
                <option key={s} value={s} disabled={s === "off" && !modelInfo.canDisable}>
                  {s === "off" ? "off (thinking disabled)" : `adaptive, effort: ${s}`}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="field">thinking.display</legend>
            <label className="radio">
              <input type="radio" name="display" checked={display === "summarized"} onChange={() => setDisplay("summarized")} />
              <span><code>summarized</code> <span className="muted">· return the reasoning text</span></span>
            </label>
            <label className="radio">
              <input type="radio" name="display" checked={display === "omitted"} onChange={() => setDisplay("omitted")} />
              <span><code>omitted</code> <span className="muted">· thinking still happens (and is billed), but hidden</span></span>
            </label>
          </fieldset>
        </div>

        <p className="muted" style={{ margin: "10px 0 0" }}>
          Adaptive means Claude decides per turn whether to think, so some runs show thinking only on the last turn, or
          not at all. Raise effort to <code>xhigh</code> or <code>max</code> to see more of it.
        </p>

        <details>
          <summary>The lesson&apos;s request</summary>
          <pre>{LESSON_6_SNIPPET}</pre>
        </details>

        <div className="row">
          {running ? (
            <button className="run" onClick={stop}>Stop</button>
          ) : (
            <button className="run" onClick={run}>Plan the trip</button>
          )}
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}
      <AgentTimeline events={events} running={running} />
    </>
  );
}
