"use client";

import { useState } from "react";
import { MODELS } from "@/lib/claude/models";
import { COURSE_MODEL } from "@/lib/courses/building-with-the-claude-api/capabilities";
import { postChat } from "@/lib/courses/building-with-the-claude-api/client-api";
import type { ChatMessage } from "@/lib/courses/building-with-the-claude-api/conversation";
import { LESSON_4_FIRST, LESSON_4_FOLLOW_UP } from "@/lib/courses/building-with-the-claude-api/lesson-04";
import { formatUsd } from "@/components/ResultCard";

type Call = { sent: ChatMessage[]; reply?: string; cost?: number };
type Column = { first?: Call; followUp?: Call };

function CallView({ label, call }: { label: string; call?: Call }) {
  if (!call) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div className="step-label">{label}: sent {call.sent.length} message{call.sent.length === 1 ? "" : "s"}</div>
      <pre style={{ margin: "4px 0" }}>{JSON.stringify(call.sent, null, 2)}</pre>
      {call.reply === undefined ? (
        <p className="muted">Waiting for Claude…</p>
      ) : (
        <div className="answer"><b>Claude:</b> {call.reply} <span className="muted">({formatUsd(call.cost ?? 0)})</span></div>
      )}
    </div>
  );
}

export function MultiTurnDemo() {
  const [model, setModel] = useState(COURSE_MODEL);
  const [first, setFirst] = useState(LESSON_4_FIRST);
  const [followUp, setFollowUp] = useState(LESSON_4_FOLLOW_UP);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [without, setWithout] = useState<Column>({});
  const [withHistory, setWithHistory] = useState<Column>({});

  async function run() {
    setRunning(true);
    setError(null);
    setWithout({});
    setWithHistory({});
    try {
      // Step 1 is the same for both: one user message.
      const firstSent: ChatMessage[] = [{ role: "user", content: first }];
      setWithout({ first: { sent: firstSent } });
      setWithHistory({ first: { sent: firstSent } });
      const r1 = await postChat({ model, messages: firstSent });
      const firstCall = { sent: firstSent, reply: r1.text, cost: r1.costUsd };

      // Step 2, two ways. Without history: a brand-new list with only the follow-up.
      const bare: ChatMessage[] = [{ role: "user", content: followUp }];
      // With history: question, Claude's answer as an assistant message, then the follow-up.
      const full: ChatMessage[] = [...firstSent, { role: "assistant", content: r1.text }, { role: "user", content: followUp }];
      setWithout({ first: firstCall, followUp: { sent: bare } });
      setWithHistory({ first: firstCall, followUp: { sent: full } });

      const [a, b] = await Promise.all([postChat({ model, messages: bare }), postChat({ model, messages: full })]);
      setWithout({ first: firstCall, followUp: { sent: bare, reply: a.text, cost: a.costUsd } });
      setWithHistory({ first: firstCall, followUp: { sent: full, reply: b.text, cost: b.costUsd } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <section className="panel">
        <div className="row" style={{ marginTop: 0 }}>
          <div className="grow">
            <label className="field" htmlFor="l4-first">1. First user message</label>
            <input id="l4-first" className="text" value={first} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <div className="grow">
            <label className="field" htmlFor="l4-follow">2. Follow-up user message</label>
            <input id="l4-follow" className="text" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="l4-model">Model</label>
            <select id="l4-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.id}{m.id === COURSE_MODEL ? " (course)" : ""}</option>)}
            </select>
          </div>
          <button className="run" onClick={run} disabled={running || !first.trim() || !followUp.trim()}>
            {running ? "Running…" : "Run both conversations"}
          </button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}

      {(without.first || withHistory.first) && (
        <div className="compare-grid">
          <section className="panel">
            <strong>Without history</strong>
            <p className="muted">Each request is sent on its own, so the follow-up arrives with no context.</p>
            <CallView label="Request 1" call={without.first} />
            <CallView label="Request 2" call={without.followUp} />
          </section>
          <section className="panel">
            <strong>With history (the lesson&apos;s way)</strong>
            <p className="muted">Claude&apos;s answer is added as an assistant message and everything is sent again.</p>
            <CallView label="Request 1" call={withHistory.first} />
            <CallView label="Request 2" call={withHistory.followUp} />
          </section>
        </div>
      )}

      <h2>The helper functions, in TypeScript</h2>
      <pre>{`function addUserMessage(messages: Anthropic.MessageParam[], text: string) {
  messages.push({ role: "user", content: text });
}

function addAssistantMessage(messages: Anthropic.MessageParam[], text: string) {
  messages.push({ role: "assistant", content: text });
}

async function chat(messages: Anthropic.MessageParam[]) {
  const message = await client.messages.create({ model, max_tokens: 1000, messages });
  const first = message.content[0];
  return first.type === "text" ? first.text : "";
}

const messages: Anthropic.MessageParam[] = [];
addUserMessage(messages, "Define quantum computing in one sentence");
const answer = await chat(messages);
addAssistantMessage(messages, answer);
addUserMessage(messages, "Write another sentence");
const finalAnswer = await chat(messages); // sends all three messages`}</pre>
      <p className="muted">
        In this app: <code>lib/courses/building-with-the-claude-api/helpers.ts</code>. The tutor chatbot (bottom right)
        works the same way: your browser keeps the list and sends all of it every time.
      </p>
    </>
  );
}
