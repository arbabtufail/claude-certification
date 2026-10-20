"use client";

import { useRef, useState } from "react";
import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, estimateCostUsd } from "@/lib/claude/models";
import { streamAgent } from "@/lib/client/stream-agent";
import { COURSE_MODEL } from "@/lib/courses/building-with-the-claude-api/capabilities";
import { postChat } from "@/lib/courses/building-with-the-claude-api/client-api";
import { EVENT_TYPES, LESSON_7_PROMPT, LONGER_PROMPT, type StreamRelayEvent } from "@/lib/courses/building-with-the-claude-api/lesson-07";
import { formatUsd } from "@/components/ResultCard";

type Logged = { ms: number; event: Anthropic.MessageStreamEvent };

function describe(e: Anthropic.MessageStreamEvent): string {
  if (e.type === "content_block_delta") {
    if (e.delta.type === "text_delta") return JSON.stringify(e.delta.text);
    return e.delta.type;
  }
  if (e.type === "content_block_start") return `block ${e.index}: ${e.content_block.type}`;
  if (e.type === "message_delta") return `stop_reason: ${e.delta.stop_reason}, output_tokens: ${e.usage.output_tokens}`;
  if (e.type === "message_start") return `id: ${e.message.id}, model: ${e.message.model}`;
  return "";
}

const CODE = {
  raw: `// stream: true returns the raw events (Python: stream=True)
const stream = await client.messages.create({
  model,
  max_tokens: 1000,
  messages,
  stream: true,
});

for await (const event of stream) {
  console.log(event); // message_start, content_block_start, content_block_delta, ...
}`,
  text: `// The helper (Python: with client.messages.stream(...) as stream)
const stream = client.messages.stream({ model, max_tokens: 1000, messages });

stream.on("text", (text) => process.stdout.write(text)); // just the text chunks (text_stream)

const finalMessage = await stream.finalMessage(); // get_final_message(): the whole message, to store`,
};

export function StreamingDemo() {
  const [model, setModel] = useState(COURSE_MODEL);
  const [prompt, setPrompt] = useState(LESSON_7_PROMPT);
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const [log, setLog] = useState<Logged[]>([]);
  const [firstTextMs, setFirstTextMs] = useState<number | null>(null);
  const [final, setFinal] = useState<{ ms: number; message: Anthropic.Message } | null>(null);
  const [waitMs, setWaitMs] = useState<number | "waiting" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<keyof typeof CODE>("text");
  const abortRef = useRef<AbortController | null>(null);

  async function stream() {
    const abort = new AbortController();
    abortRef.current = abort;
    setRunning(true);
    setError(null);
    setText("");
    setLog([]);
    setFirstTextMs(null);
    setFinal(null);
    setWaitMs(null);
    try {
      await streamAgent<StreamRelayEvent>("/api/building-with-the-claude-api/stream", { model, prompt }, abort.signal, (e) => {
        if (e.type === "event") {
          setLog((l) => [...l, { ms: e.ms, event: e.event }]);
          if (e.event.type === "content_block_delta" && e.event.delta.type === "text_delta") {
            const chunk = e.event.delta.text;
            setText((t) => t + chunk);
            setFirstTextMs((f) => f ?? e.ms);
          }
        } else if (e.type === "final") setFinal({ ms: e.ms, message: e.message });
        else if (e.type === "error") setError(e.error);
      });
    } catch (err) {
      if (!abort.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  // The same request without streaming: nothing to show until the whole reply is done.
  async function noStream() {
    setWaitMs("waiting");
    const started = performance.now();
    try {
      await postChat({ model, messages: [{ role: "user", content: prompt }] });
      setWaitMs(Math.round(performance.now() - started));
    } catch (err) {
      setWaitMs(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const counts = log.reduce<Record<string, number>>((m, l) => ({ ...m, [l.event.type]: (m[l.event.type] ?? 0) + 1 }), {});

  return (
    <>
      <section className="panel">
        <div className="tabs">
          <button className="tab" aria-selected={prompt === LESSON_7_PROMPT} onClick={() => setPrompt(LESSON_7_PROMPT)}>Lesson prompt</button>
          <button className="tab" aria-selected={prompt === LONGER_PROMPT} onClick={() => setPrompt(LONGER_PROMPT)}>Longer reply (easier to see)</button>
        </div>
        <label className="field" htmlFor="l7-prompt">User message</label>
        <input id="l7-prompt" className="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="l7-model">Model</label>
            <select id="l7-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.id}{m.id === COURSE_MODEL ? " (course)" : ""}</option>)}
            </select>
          </div>
          {running ? (
            <button className="run" onClick={() => abortRef.current?.abort()}>Stop</button>
          ) : (
            <button className="run" onClick={stream} disabled={!prompt.trim()}>Stream it</button>
          )}
          <button className="run secondary" onClick={noStream} disabled={running || waitMs === "waiting" || !prompt.trim()}>
            {waitMs === "waiting" ? "Waiting for the whole reply…" : "Same request, no streaming"}
          </button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}

      {(running || text || waitMs !== null) && (
        <section className="panel">
          <div className="meta">
            {firstTextMs !== null && <span>first text after: <b>{(firstTextMs / 1000).toFixed(2)}s</b></span>}
            {final && <span>stream finished after: <b>{(final.ms / 1000).toFixed(2)}s</b></span>}
            {typeof waitMs === "number" && <span>without streaming, nothing to show for: <b>{(waitMs / 1000).toFixed(2)}s</b></span>}
            {final && <span>cost: <b>{formatUsd(estimateCostUsd(model, final.message.usage.input_tokens, final.message.usage.output_tokens))}</b></span>}
          </div>
          <div className="answer">{text}{running ? " ▍" : ""}</div>
        </section>
      )}

      {log.length > 0 && (
        <>
          <h2>Every event received ({log.length})</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Event type</th><th>Python name</th><th className="num">Count</th><th>What it is</th></tr></thead>
              <tbody>
                {EVENT_TYPES.map((t) => (
                  <tr key={t.type} className={counts[t.type] ? "highlight" : undefined}>
                    <td><code>{t.type}</code></td>
                    <td><code>{t.python}</code></td>
                    <td className="num">{counts[t.type] ?? 0}</td>
                    <td className="wrap">{t.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details>
            <summary>Event log, in arrival order</summary>
            <ul className="feed">
              {log.map((l, i) => (
                <li key={i} className={l.event.type === "content_block_delta" ? undefined : "feed-tool"}>
                  <span className="muted">{(l.ms / 1000).toFixed(2)}s</span> <b>{l.event.type}</b> {describe(l.event)}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}

      {final && (
        <details>
          <summary>finalMessage(): the assembled message to store</summary>
          <pre>{JSON.stringify(final.message, null, 2)}</pre>
        </details>
      )}

      <h2>The code</h2>
      <div className="tabs">
        <button className="tab" aria-selected={code === "text"} onClick={() => setCode("text")}>Text only + final message</button>
        <button className="tab" aria-selected={code === "raw"} onClick={() => setCode("raw")}>Raw events</button>
      </div>
      <pre>{CODE[code]}</pre>
      <p className="muted">
        This page&apos;s server reads the events (<code>app/api/building-with-the-claude-api/stream/route.ts</code>) and
        forwards each one to your browser as it arrives, the way the lesson describes.
      </p>
    </>
  );
}
