"use client";

import { useEffect, useState } from "react";
import { LESSON_10_MODEL, LESSON_10_MODELS, MEMORY_SESSIONS, SNIPPETS } from "@/lib/courses/claude-platform-101/lesson-10";
import { useAgentRun } from "@/lib/client/use-agent-run";
import { AgentTimeline } from "@/components/AgentTimeline";

type MemoryFile = { path: string; content: string };
const URL_ = "/api/claude-platform-101/lesson-10/memory";

export function MemoryDemo() {
  const [prompt, setPrompt] = useState(MEMORY_SESSIONS[0].prompt);
  const [model, setModel] = useState(LESSON_10_MODEL);
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const { events, running, error, start, stop } = useAgentRun();

  const refresh = () => fetch(URL_).then((r) => r.json()).then((d) => setFiles(d.files ?? []));
  useEffect(() => { refresh(); }, []);

  async function run() {
    await start(URL_, { prompt, model }); // every run is a brand-new conversation
    refresh();
  }

  async function clear() {
    await fetch(URL_, { method: "DELETE" });
    refresh();
  }

  return (
    <>
      <section className="panel">
        <p className="muted" style={{ marginTop: 0 }}>
          Each run below is a <b>new conversation</b> with no history. The only thing that carries over is the memory
          directory, which Claude reads and writes with the memory tool. Your code stores it: here, in this
          project&apos;s <code>.memory/</code> folder (git-ignored).
        </p>
        <div className="tabs">
          {MEMORY_SESSIONS.map((s) => (
            <button key={s.label} className="tab" aria-selected={prompt === s.prompt} onClick={() => setPrompt(s.prompt)}>{s.label}</button>
          ))}
        </div>
        <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <details><summary>The request (tool runner + SDK memory helper)</summary><pre>{SNIPPETS.memory}</pre></details>
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="mem-model">Model</label>
            <select id="mem-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {LESSON_10_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {running ? <button className="run" onClick={stop}>Stop</button> : <button className="run" onClick={run}>Start a new session</button>}
        </div>
      </section>

      <section className="panel">
        <div className="result-head">
          <strong>Memory directory: /memories</strong>
          <span>
            <button className="link" onClick={refresh}>Refresh</button>{" · "}
            <button className="link" onClick={clear} disabled={running}>Clear all memory</button>
          </span>
        </div>
        {files.length === 0 ? (
          <p className="muted">Empty. Run session 1 to give Claude something to remember.</p>
        ) : (
          files.map((f) => (
            <details key={f.path} open>
              <summary><code>{f.path}</code></summary>
              <pre>{f.content}</pre>
            </details>
          ))
        )}
      </section>

      {error && <section className="panel error">{error}</section>}
      <AgentTimeline events={events} running={running} showJson />
    </>
  );
}
