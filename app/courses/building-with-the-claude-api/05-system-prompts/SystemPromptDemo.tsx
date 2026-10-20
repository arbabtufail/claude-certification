"use client";

import { useState } from "react";
import { MODELS } from "@/lib/claude/models";
import { COURSE_MODEL } from "@/lib/courses/building-with-the-claude-api/capabilities";
import { postChat } from "@/lib/courses/building-with-the-claude-api/client-api";
import type { ChatMessage } from "@/lib/courses/building-with-the-claude-api/conversation";
import { LESSON_5_QUESTION, SYSTEM_PRESETS } from "@/lib/courses/building-with-the-claude-api/lesson-05";
import { formatUsd } from "@/components/ResultCard";

function Transcript({ messages }: { messages: ChatMessage[] }) {
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
      {messages.map((m, i) => (
        <div key={i} className={m.role === "user" ? "muted" : "answer"}>
          <b>{m.role === "user" ? "Student" : "Claude"}:</b> {m.content}
        </div>
      ))}
    </div>
  );
}

export function SystemPromptDemo() {
  const [model, setModel] = useState(COURSE_MODEL);
  const [question, setQuestion] = useState(LESSON_5_QUESTION);
  const [system, setSystem] = useState(SYSTEM_PRESETS[0].system);
  const [plain, setPlain] = useState<ChatMessage[]>([]);
  const [tutored, setTutored] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [cost, setCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function compare() {
    setBusy(true);
    setError(null);
    const start: ChatMessage[] = [{ role: "user", content: question }];
    setPlain(start);
    setTutored(start);
    setCost(0);
    try {
      // Same messages, the only difference is the system parameter.
      const [a, b] = await Promise.all([postChat({ model, messages: start }), postChat({ model, messages: start, system })]);
      setPlain([...start, { role: "assistant", content: a.text }]);
      setTutored([...start, { role: "assistant", content: b.text }]);
      setCost(a.costUsd + b.costUsd);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // Keep going with the tutor: lesson 4's history + lesson 5's system prompt on every request.
  async function sendReply() {
    const next: ChatMessage[] = [...tutored, { role: "user", content: reply }];
    setTutored(next);
    setReply("");
    setBusy(true);
    setError(null);
    try {
      const r = await postChat({ model, messages: next, system });
      setTutored([...next, { role: "assistant", content: r.text }]);
      setCost((c) => c + r.costUsd);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="panel">
        <div className="tabs">
          {SYSTEM_PRESETS.map((p) => (
            <button key={p.label} className="tab" aria-selected={system === p.system} onClick={() => setSystem(p.system)}>{p.label}</button>
          ))}
        </div>
        <label className="field" htmlFor="l5-system">system (a top-level parameter, not a message)</label>
        <textarea id="l5-system" rows={4} value={system} onChange={(e) => setSystem(e.target.value)} />
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="l5-q">Student&apos;s question</label>
            <input id="l5-q" className="text" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
          <div>
            <label className="field" htmlFor="l5-model">Model</label>
            <select id="l5-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.id}{m.id === COURSE_MODEL ? " (course)" : ""}</option>)}
            </select>
          </div>
          <button className="run" onClick={compare} disabled={busy || !question.trim()}>
            {busy && tutored.length <= 1 ? "Asking…" : "Ask with and without the system prompt"}
          </button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}

      {tutored.length > 0 && (
        <>
          <div className="compare-grid">
            <section className="panel">
              <strong>Without a system prompt</strong>
              <Transcript messages={plain} />
            </section>
            <section className="panel">
              <strong>With the system prompt</strong>
              <Transcript messages={tutored} />
              {tutored.length > 1 && tutored.at(-1)!.role === "assistant" && (
                <div className="row">
                  <div className="grow">
                    <label className="field" htmlFor="l5-reply">Answer as the student</label>
                    <input
                      id="l5-reply"
                      className="text"
                      placeholder="e.g. subtract 2 from both sides?"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && reply.trim() && !busy && sendReply()}
                    />
                  </div>
                  <button className="run" onClick={sendReply} disabled={busy || !reply.trim()}>Send</button>
                </div>
              )}
              {busy && tutored.at(-1)?.role === "user" && <p className="muted">Waiting for the tutor…</p>}
            </section>
          </div>
          <p className="muted">Spent so far: {formatUsd(cost)}</p>
        </>
      )}

      <h2>The flexible chat function, in TypeScript</h2>
      <pre>{`async function chat(messages: Anthropic.MessageParam[], system?: string) {
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: 1000,
    messages,
  };
  if (system) params.system = system; // the API rejects system: null, so only add it when set

  const message = await client.messages.create(params);
  const first = message.content[0];
  return first.type === "text" ? first.text : "";
}

const answer = await chat(messages);          // without
const tutored = await chat(messages, system); // with`}</pre>
    </>
  );
}
