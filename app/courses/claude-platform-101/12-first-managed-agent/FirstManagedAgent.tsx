"use client";

import { useEffect, useRef, useState } from "react";
import { KICKOFFS, LESSON_12_MODELS, LINE_COUNTER, NETWORKING, STEPS, type Networking } from "@/lib/courses/claude-platform-101/lesson-12";

type State = { agent?: { id: string; version: number; model: string }; environment?: { id: string; networking: Networking } };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ev = Record<string, any>;

const API = "/api/claude-platform-101/lesson-12";

async function post<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export function FirstManagedAgent() {
  const [state, setState] = useState<State>({});
  const [model, setModel] = useState(LINE_COUNTER.model);
  const [networking, setNetworking] = useState<Networking>("limited");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState(KICKOFFS[0].text);
  const [title, setTitle] = useState("Count lines demo");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [done, setDone] = useState<Ev | null>(null);
  const [answered, setAnswered] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const termRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    fetch(`${API}/setup`).then((r) => r.json()).then(setState).catch(() => {});
  }, []);
  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [events]);

  async function create(stepName: "agent" | "environment") {
    setBusy(stepName);
    setError(null);
    try {
      setState(await post<State>(`${API}/setup`, stepName === "agent" ? { step: "agent", model } : { step: "environment", networking }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function run() {
    setRunning(true);
    setError(null);
    setEvents([]);
    setDone(null);
    setSessionId(null);
    setAnswered([]);
    setStep(3);
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const res = await fetch(`${API}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, title }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (true) {
        const { value, done: finished } = await reader.read();
        if (finished) break;
        buffer += value;
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const e: Ev = JSON.parse(part.slice(6));
          if (e.type === "relay.step") { setStep(e.step); if (e.sessionId) setSessionId(e.sessionId); }
          else if (e.type === "relay.done") setDone(e);
          else if (e.type === "relay.error") setError(e.error);
          else setEvents((cur) => [...cur, e]);
        }
      }
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function confirm(eventId: string, allow: boolean) {
    if (!sessionId) return;
    setAnswered((a) => [...a, eventId]);
    await post(`${API}/confirm`, { sessionId, eventId, allow }).catch((e) => setError(e.message));
  }

  // The lesson's three events, rendered like its terminal output.
  const terminal = events
    .map((e) => {
      if (e.type === "agent.message") return e.text ?? "";
      if (e.type === "agent.tool_use") return `\n[tool] ${e.name} ${e.input ?? ""}\n`;
      if (e.type === "session.status_idle" && e.stop_reason !== "requires_action") return "\n--- Agent done ---";
      return "";
    })
    .join("");
  const pending = events.filter((e) => e.type === "agent.tool_use" && e.evaluated_permission === "ask" && !answered.includes(e.id));
  const counts = events.reduce<Record<string, number>>((m, e) => ({ ...m, [e.type]: (m[e.type] ?? 0) + 1 }), {});
  const ready = Boolean(state.agent && state.environment);
  const cost = done?.usage?.list_cost?.amount ? `$${(Number(done.usage.list_cost.amount) / 100).toFixed(2)}` : null;

  const primitive = (label: string, what: string, value: React.ReactNode, active: boolean) => (
    <div className={`primitive${active ? " active" : ""}`}>
      <div className="step-label">{label}</div>
      <div className="muted">{what}</div>
      <div style={{ marginTop: 6 }}>{value}</div>
    </div>
  );

  return (
    <>
      <div className="primitives">
        {primitive("Agent", "Persona: model, system prompt, toolset. Reusable.", state.agent ? <><code>{state.agent.id}</code><br /><span className="muted">{state.agent.model} · v{state.agent.version}</span></> : <span className="muted">not created</span>, !!state.agent)}
        {primitive("Environment", "Where it runs: cloud container, networking.", state.environment ? <><code>{state.environment.id}</code><br /><span className="muted">networking: {state.environment.networking}</span></> : <span className="muted">not created</span>, !!state.environment)}
        {primitive("Session", "One run of the agent in the environment.", sessionId ? <code>{sessionId}</code> : <span className="muted">created on each run</span>, !!sessionId)}
        {primitive("Events", "Everything flowing in and out.", <b>{events.length} received</b>, events.length > 0)}
      </div>

      <h2>Steps 1-2: create once</h2>
      <section className="panel">
        <div className="option-grid" style={{ marginTop: 0 }}>
          <div>
            <label className="field" htmlFor="l12-model">1. Agent model</label>
            <select id="l12-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {LESSON_12_MODELS.map((m) => <option key={m} value={m}>{m}{m === LINE_COUNTER.model ? " (lesson)" : ""}</option>)}
            </select>
            <div className="row">
              <button className="run secondary" disabled={!!busy} onClick={() => create("agent")}>
                {busy === "agent" ? "Creating…" : state.agent ? "Create a new agent" : "Step 1: Create the agent"}
              </button>
            </div>
          </div>
          <fieldset>
            <legend className="field">2. Environment networking</legend>
            {(Object.keys(NETWORKING) as Networking[]).map((n) => (
              <label key={n} className="radio">
                <input type="radio" name="net" checked={networking === n} onChange={() => setNetworking(n)} />
                <span><code>{NETWORKING[n].label}</code><br /><span className="muted">{NETWORKING[n].help}</span></span>
              </label>
            ))}
            <div className="row">
              <button className="run secondary" disabled={!!busy} onClick={() => create("environment")}>
                {busy === "environment" ? "Creating…" : state.environment ? "Create a new environment" : "Step 2: Create the environment"}
              </button>
            </div>
          </fieldset>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          You only need these once. Their IDs are saved in <code>.managed-agents-lesson12.json</code> and every run reuses them.
        </p>
      </section>

      <h2>Steps 3-5: run a session</h2>
      <section className="panel">
        <div className="tabs">
          {KICKOFFS.map((k) => (
            <button key={k.label} className="tab" aria-selected={prompt === k.text} onClick={() => { setPrompt(k.text); setTitle(k.label === "Lesson task" ? "Count lines demo" : k.label); }}>{k.label}</button>
          ))}
        </div>
        <label className="field" htmlFor="l12-prompt">Kickoff user.message</label>
        <textarea id="l12-prompt" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="l12-title">Session title</label>
            <input id="l12-title" className="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {running ? (
            <button className="run" onClick={() => abortRef.current?.abort()}>Stop watching</button>
          ) : (
            <button className="run" disabled={!ready} onClick={run}>{ready ? "Run session" : "Do steps 1 and 2 first"}</button>
          )}
        </div>

        <ol className="steps">
          {STEPS.map((s) => {
            const status = s.n <= 2 ? (s.n === 1 ? !!state.agent : !!state.environment) : step > s.n || (step === s.n && !running && !!done);
            const current = running && step === s.n;
            return (
              <li key={s.n} className={status ? "done" : current ? "current" : undefined}>
                <details>
                  <summary>{status ? "✓" : current ? "…" : "○"} Step {s.n}: {s.title}</summary>
                  <pre>{s.code}</pre>
                </details>
              </li>
            );
          })}
        </ol>
      </section>

      {error && <section className="panel error">{error}</section>}

      {pending.map((e) => (
        <section key={e.id} className="panel approval">
          <b>The agent wants to run a tool that needs your approval:</b> <code>{e.name} {e.input}</code>
          <div className="row">
            <button className="run" onClick={() => confirm(e.id, true)}>Allow</button>
            <button className="run secondary" onClick={() => confirm(e.id, false)}>Deny</button>
          </div>
        </section>
      ))}

      {(events.length > 0 || running) && (
        <>
          <div className="result-head" style={{ marginTop: 16 }}>
            <strong>Output (the lesson&apos;s three events)</strong>
            {sessionId && (
              <a href={`https://platform.claude.com/workspaces/default/sessions/${sessionId}`} target="_blank" rel="noreferrer">Open the trace in the Console</a>
            )}
          </div>
          <pre className="terminal" ref={termRef}>{terminal || (running ? "Waiting for the agent…" : "")}{running ? " ▍" : ""}</pre>
        </>
      )}

      {done && (
        <section className="panel">
          <div className="meta" style={{ marginBottom: 0 }}>
            <span>status: <b>{done.status}</b></span>
            {done.usage && <span>tokens: <b>{(done.usage.input_tokens ?? 0) + (done.usage.cache_read_input_tokens ?? 0)}</b> in / <b>{done.usage.output_tokens ?? 0}</b> out</span>}
            {done.usage?.active_seconds !== undefined && <span>container active: <b>{Math.round(done.usage.active_seconds)}s</b></span>}
            {cost && <span>list cost: <b>{cost}</b></span>}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <details>
          <summary>Every event received ({events.length}): {Object.entries(counts).map(([t, n]) => `${t} ×${n}`).join(", ")}</summary>
          <pre>{JSON.stringify(events, null, 2)}</pre>
        </details>
      )}
    </>
  );
}
