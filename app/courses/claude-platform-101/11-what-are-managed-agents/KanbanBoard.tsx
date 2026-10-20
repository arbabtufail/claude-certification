"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AGENT_DEFINITION,
  AGENT_MODELS,
  BUILDING_BLOCKS,
  MAX_ITERATIONS,
  SESSION_BUDGET_CENTS,
  SNIPPET,
  TICKETS,
  type Ticket,
} from "@/lib/courses/claude-platform-101/lesson-11";

type Setup = { environmentId: string; agentId: string; agentVersion: number; model: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ev = Record<string, any>;
type Output = { id: string; filename: string; size: number };
type Card = {
  sessionId?: string;
  column: "todo" | "progress" | "done";
  events: Ev[];
  answered: string[]; // tool calls we already allowed/denied
  outputs?: Output[];
  result?: string; // final grader verdict
  cost?: string;
  error?: string;
};

const API = "/api/claude-platform-101/lesson-11";
const STORE_KEY = "lesson11-board";

async function api<T>(url: string, method = "GET", body?: object): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

function describe(e: Ev): { icon: string; text: string; tone?: "tool" | "grader" | "error" | "muted" } | null {
  switch (e.type) {
    case "user.define_outcome": return { icon: "🎯", text: `Outcome sent: ${e.description}`, tone: "muted" };
    case "session.status_running": return { icon: "▶", text: "Session running", tone: "muted" };
    case "session.status_idle": return { icon: "⏸", text: `Idle (${e.stop_reason ?? "?"})`, tone: "muted" };
    case "session.status_terminated": return { icon: "■", text: "Session terminated", tone: "muted" };
    case "agent.thinking": return null; // a progress signal only; it carries no text
    case "agent.message": return e.text ? { icon: "💬", text: e.text } : null;
    case "agent.tool_use": return { icon: "🔧", text: `${e.name} ${e.input ?? ""}`, tone: "tool" };
    case "agent.tool_result": return { icon: e.is_error ? "⚠" : "↳", text: e.text ?? "(no output)", tone: e.is_error ? "error" : "muted" };
    case "span.outcome_evaluation_start": return { icon: "🧑‍⚖️", text: `Grader checking iteration ${e.iteration + 1}…`, tone: "grader" };
    case "span.outcome_evaluation_end": return { icon: e.result === "satisfied" ? "✅" : "🔁", text: `Grader: ${e.result}. ${e.explanation ?? ""}`, tone: "grader" };
    case "session.error": return { icon: "✖", text: e.error ?? "Session error", tone: "error" };
    case "relay.error": return { icon: "✖", text: e.error ?? "Stream error", tone: "error" };
    default: return null;
  }
}

function costOf(events: Ev[]): string | undefined {
  const last = [...events].reverse().find((e) => e.list_cost);
  if (!last) return undefined;
  const lc = last.list_cost;
  return typeof lc === "object" && lc.amount ? `$${(Number(lc.amount) / 100).toFixed(2)}` : String(lc);
}

export function KanbanBoard() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [model, setModel] = useState(AGENT_DEFINITION.model);
  const [busy, setBusy] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [cards, setCards] = useState<Record<string, Card>>(() => Object.fromEntries(TICKETS.map((t) => [t.id, { column: "todo", events: [], answered: [] }])));
  const [dragging, setDragging] = useState<string | null>(null);
  const sources = useRef<Record<string, EventSource>>({});

  const update = (id: string, patch: (c: Card) => Card) => setCards((cur) => ({ ...cur, [id]: patch(cur[id]) }));

  // Persist the board so a reload can reconnect to running sessions.
  useEffect(() => {
    try {
      const slim = Object.fromEntries(Object.entries(cards).map(([k, c]) => [k, { ...c, events: [] }]));
      localStorage.setItem(STORE_KEY, JSON.stringify(slim));
    } catch {}
  }, [cards]);

  const finish = useCallback(async (ticketId: string, sessionId: string) => {
    try {
      // Output files can take a few seconds to be indexed after the session goes idle.
      let s = await api<{ outputs: Output[]; outcome_evaluations: { result: string }[] }>(`${API}/sessions/${sessionId}`);
      for (let i = 0; i < 3 && s.outputs.length === 0; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        s = await api(`${API}/sessions/${sessionId}`);
      }
      update(ticketId, (c) => ({ ...c, column: "done", outputs: s.outputs, result: s.outcome_evaluations.at(-1)?.result ?? c.result }));
    } catch (e) {
      update(ticketId, (c) => ({ ...c, column: "done", error: e instanceof Error ? e.message : String(e) }));
    }
  }, []);

  const watch = useCallback((ticketId: string, sessionId: string) => {
    sources.current[ticketId]?.close();
    const es = new EventSource(`${API}/sessions/${sessionId}/events`);
    sources.current[ticketId] = es;
    es.onmessage = (msg) => {
      const e: Ev = JSON.parse(msg.data);
      if (e.type === "relay.closed") {
        es.close(); // stop EventSource from auto-reconnecting
        finish(ticketId, sessionId);
        return;
      }
      update(ticketId, (c) => {
        if (e.id && c.events.some((x) => x.id === e.id)) return c; // dedupe
        const events = [...c.events, e];
        const result = e.type === "span.outcome_evaluation_end" ? e.result : c.result;
        return { ...c, events, result, cost: costOf(events) ?? c.cost };
      });
    };
    es.onerror = () => es.close();
  }, [finish]);

  useEffect(() => {
    api<{ setup: Setup | null }>(`${API}/setup`).then((d) => { setSetup(d.setup); if (d.setup) setModel(d.setup.model); }).catch(() => {});
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null") as Record<string, Card> | null;
      if (saved) {
        setCards((cur) => ({ ...cur, ...saved }));
        for (const [id, c] of Object.entries(saved)) if (c.sessionId) watch(id, c.sessionId); // reconnect + replay
      }
    } catch {}
    const all = sources.current;
    return () => Object.values(all).forEach((s) => s.close());
  }, [watch]);

  async function runSetup(method: "POST" | "PATCH") {
    setBusy(true);
    setSetupError(null);
    try {
      setSetup((await api<{ setup: Setup }>(`${API}/setup`, method, { model })).setup);
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function start(ticket: Ticket) {
    if (!setup || cards[ticket.id].column !== "todo") return;
    update(ticket.id, (c) => ({ ...c, column: "progress", events: [], error: undefined }));
    try {
      const { sessionId } = await api<{ sessionId: string }>(`${API}/sessions`, "POST", { ticketId: ticket.id });
      update(ticket.id, (c) => ({ ...c, sessionId }));
      watch(ticket.id, sessionId);
    } catch (e) {
      update(ticket.id, (c) => ({ ...c, column: "todo", error: e instanceof Error ? e.message : String(e) }));
    }
  }

  async function confirm(ticketId: string, eventId: string, allow: boolean) {
    const c = cards[ticketId];
    if (!c.sessionId) return;
    update(ticketId, (x) => ({ ...x, answered: [...x.answered, eventId] }));
    await api(`${API}/sessions/${c.sessionId}`, "POST", { action: "confirm", eventId, allow });
  }

  function reset(ticketId: string) {
    sources.current[ticketId]?.close();
    update(ticketId, () => ({ column: "todo", events: [], answered: [] }));
  }

  const column = (key: Card["column"], title: string) => (
    <div
      className={`kanban-col${dragging && key === "progress" ? " drop-target" : ""}`}
      onDragOver={(e) => key === "progress" && e.preventDefault()}
      onDrop={() => { const t = TICKETS.find((x) => x.id === dragging); if (key === "progress" && t) start(t); setDragging(null); }}
    >
      <div className="kanban-col-title">{title}</div>
      {TICKETS.filter((t) => cards[t.id].column === key).map((t) => {
        const c = cards[t.id];
        const pending = c.events.filter((e) => e.type === "agent.tool_use" && e.evaluated_permission === "ask" && !c.answered.includes(e.id));
        return (
          <div key={t.id} className="kanban-card" draggable={key === "todo" && !!setup} onDragStart={() => setDragging(t.id)} onDragEnd={() => setDragging(null)}>
            <div className="card-head">
              <strong>{t.title}</strong>
              {c.result && <span className={`pill pill-${c.result === "satisfied" ? "end_turn" : "max_tokens"}`}>{c.result}</span>}
            </div>
            <p className="muted" style={{ margin: "4px 0" }}>{t.description}</p>
            <details><summary>Rubric (what done looks like)</summary><pre>{t.rubric}</pre></details>

            {key === "todo" && (
              <button className="run secondary" disabled={!setup} onClick={() => start(t)}>
                {setup ? "Start → (or drag to In progress)" : "Run setup first"}
              </button>
            )}
            {c.error && <p className="error">{c.error}</p>}

            {pending.map((e) => (
              <div key={e.id} className="approval">
                <b>Needs your approval:</b> <code>{e.name} {e.input}</code>
                <div className="row" style={{ marginTop: 6 }}>
                  <button className="run" onClick={() => confirm(t.id, e.id, true)}>Allow</button>
                  <button className="run secondary" onClick={() => confirm(t.id, e.id, false)}>Deny</button>
                </div>
              </div>
            ))}

            {c.sessionId && (
              <div className="meta" style={{ marginTop: 6 }}>
                <span>session <code>{c.sessionId.slice(0, 16)}…</code></span>
                <span>events: <b>{c.events.length}</b></span>
                <span>tool calls: <b>{c.events.filter((e) => e.type === "agent.tool_use").length}</b></span>
                {c.cost && <span>list cost: <b>{c.cost}</b></span>}
                <a href={`https://platform.claude.com/workspaces/default/sessions/${c.sessionId}`} target="_blank" rel="noreferrer">Console trace</a>
              </div>
            )}

            {c.events.length > 0 && (
              <ol className="feed">
                {c.events.map((e, i) => {
                  const d = describe(e);
                  return d ? <li key={e.id ?? i} className={d.tone ? `feed-${d.tone}` : undefined}><span>{d.icon}</span> {d.text}</li> : null;
                })}
              </ol>
            )}

            {key === "progress" && c.sessionId && (
              <button className="link" onClick={() => api(`${API}/sessions/${c.sessionId}`, "POST", { action: "interrupt" })}>Interrupt</button>
            )}

            {key === "done" && (
              <>
                {c.outputs && c.outputs.length > 0 ? (
                  <div className="outputs">
                    <b>Deliverables</b> (from /mnt/session/outputs/):
                    {c.outputs.map((f) => (
                      <a key={f.id} href={`${API}/files/${f.id}?name=${encodeURIComponent(f.filename)}`} target="_blank" rel="noreferrer">
                        {f.filename} <span className="muted">({f.size} B)</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No output files found.</p>
                )}
                <button className="link" onClick={() => reset(t.id)}>Move back to To do</button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <section className="panel table-wrap">
        <table>
          <thead><tr><th>Building block</th><th>What it is</th><th>In this demo</th></tr></thead>
          <tbody>
            {BUILDING_BLOCKS.map((b) => (
              <tr key={b.name}><td><b>{b.name}</b></td><td className="wrap">{b.what}</td><td className="wrap muted">{b.here}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2>1. Setup (once): environment + agent</h2>
      <section className="panel">
        {setup ? (
          <div className="meta">
            <span>agent <code>{setup.agentId}</code> · version <b>{setup.agentVersion}</b> · model <b>{setup.model}</b></span>
            <span>environment <code>{setup.environmentId}</code></span>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 0 }}>Nothing set up yet. This creates one environment and one agent in your workspace, and stores their IDs in <code>.managed-agents.json</code>.</p>
        )}
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="ma-model">Agent model</label>
            <select id="ma-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {AGENT_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {!setup ? (
            <button className="run" disabled={busy} onClick={() => runSetup("POST")}>{busy ? "Creating…" : "Create environment + agent"}</button>
          ) : (
            <button className="run secondary" disabled={busy || model === setup.model} onClick={() => runSetup("PATCH")}>
              {busy ? "Updating…" : "Update agent (new version)"}
            </button>
          )}
        </div>
        {setupError && <p className="error">{setupError}</p>}
        <details><summary>The code behind this board</summary><pre>{SNIPPET}</pre></details>
      </section>

      <h2>2. The board</h2>
      <p className="muted">
        Each ticket in progress is its own session and container, capped at ${(SESSION_BUDGET_CENTS / 100).toFixed(2)} and
        up to {MAX_ITERATIONS} grader rounds. Start two at once to see them run in parallel.
      </p>
      <div className="kanban">
        {column("todo", "To do")}
        {column("progress", "In progress")}
        {column("done", "Done")}
      </div>
    </>
  );
}
