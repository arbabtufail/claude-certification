"use client";

import { useState } from "react";
import { MODELS } from "@/lib/claude/models";
import { LESSON_4_DEFAULT_TOOLS, LESSON_4_MODEL, LESSON_4_SAMPLES, LESSON_4_TOOLS } from "@/lib/courses/claude-platform-101/lesson-04";
import { useAgentRun } from "@/lib/client/use-agent-run";
import { AgentTimeline } from "@/components/AgentTimeline";

export function AgentLoopDemo() {
  const [prompt, setPrompt] = useState(LESSON_4_SAMPLES[0].prompt);
  const [model, setModel] = useState(LESSON_4_MODEL);
  const [toolNames, setToolNames] = useState<string[]>(LESSON_4_DEFAULT_TOOLS);
  const { events, running, error, start, stop } = useAgentRun();

  const sample = LESSON_4_SAMPLES.find((s) => s.prompt === prompt);

  function toggleTool(name: string) {
    setToolNames((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));
  }

  const run = () => start("/api/claude-platform-101/lesson-04/agent", { prompt, model, tools: toolNames });

  return (
    <>
      <section className="panel">
        <div className="tabs">
          {LESSON_4_SAMPLES.map((s) => (
            <button key={s.label} className="tab" aria-selected={prompt === s.prompt} onClick={() => { setPrompt(s.prompt); setToolNames(s.tools); }}>
              {s.label}
            </button>
          ))}
        </div>

        <label className="field" htmlFor="agent-prompt">Task for the agent</label>
        <textarea id="agent-prompt" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        {sample && <p className="muted" style={{ margin: "6px 0 0" }}>Expect: {sample.expect}</p>}

        <div style={{ marginTop: 12 }}>
          <span className="field">Tools sent to Claude (the tools array)</span>
          <div className="checks">
            {LESSON_4_TOOLS.map((t) => (
              <label key={t.name}>
                <input type="checkbox" checked={toolNames.includes(t.name)} onChange={() => toggleTool(t.name)} />
                <code>{t.name}</code>
              </label>
            ))}
          </div>
        </div>

        <details>
          <summary>Tool definitions (name, description, input_schema)</summary>
          <pre>{JSON.stringify(LESSON_4_TOOLS.filter((t) => toolNames.includes(t.name)), null, 2)}</pre>
          <p className="muted">
            Mock data exists for Austin, Seattle, London, New York, Karachi and Dubai. Any other city makes the tool
            return an error.
          </p>
        </details>

        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="agent-model">Model</label>
            <select id="agent-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.id}{m.id === LESSON_4_MODEL ? " (used in lesson 4)" : ""}</option>
              ))}
            </select>
          </div>
          {running ? (
            <button className="run" onClick={stop}>Stop</button>
          ) : (
            <button className="run" onClick={run}>Run agent</button>
          )}
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}
      <AgentTimeline events={events} running={running} />
    </>
  );
}
