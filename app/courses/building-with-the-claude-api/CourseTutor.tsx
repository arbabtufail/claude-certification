"use client";

// THE COURSE TUTOR: a chatbot on every page of "Building with the Claude API".
// Built from the course's own lessons:
//   lesson 4: this component keeps the messages list and sends all of it every time
//   lesson 5: the server adds a system prompt (lib/courses/building-with-the-claude-api/tutor.ts)
//   lesson 6: optional temperature, for the models that accept it
//   lesson 7: the reply streams in
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MODELS } from "@/lib/claude/models";
import { streamAgent } from "@/lib/client/stream-agent";
import { supportsTemperature } from "@/lib/courses/building-with-the-claude-api/capabilities";
import type { ChatMessage } from "@/lib/courses/building-with-the-claude-api/conversation";
import type { TutorEvent } from "@/lib/courses/building-with-the-claude-api/tutor";
import { formatUsd } from "@/components/ResultCard";

const STORAGE_KEY = "bwca-tutor-v1";
const DEFAULT_MODEL = "claude-opus-5-5";
const COURSE_PREFIX = "/courses/building-with-the-claude-api/";

type Saved = { messages: ChatMessage[]; model: string; temperature: number | null; spent: number };

// Replies use markdown code fences. Show those as code blocks, everything else as plain text.
function Reply({ text }: { text: string }) {
  const parts = text.split(/```[a-zA-Z]*\n?/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <pre key={i} className="tutor-code">{p.replace(/\n$/, "")}</pre> : p && <span key={i}>{p}</span>,
      )}
    </>
  );
}

export function CourseTutor() {
  const pathname = usePathname();
  const lessonSlug = pathname.startsWith(COURSE_PREFIX) ? pathname.slice(COURSE_PREFIX.length).split("/")[0] : null;

  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [spent, setSpent] = useState(0);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [last, setLast] = useState<Extract<TutorEvent, { type: "done" }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const loaded = useRef(false);

  // Keep the conversation across page reloads (this browser only).
  useEffect(() => {
    try {
      const saved: Saved | null = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved) {
        setMessages(saved.messages ?? []);
        if (MODELS.some((m) => m.id === saved.model)) setModel(saved.model);
        setTemperature(saved.temperature ?? null);
        setSpent(saved.spent ?? 0);
      }
    } catch {
      // storage unavailable: start fresh
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current || streaming) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, model, temperature, spent } satisfies Saved));
    } catch {
      // storage unavailable: nothing to do
    }
  }, [messages, model, temperature, spent, streaming]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    // Lesson 4: add the user message, then send the whole list.
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setLast(null);
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;
    let reply = "";
    try {
      await streamAgent<TutorEvent | { type: "error"; error: string }>(
        "/api/building-with-the-claude-api/tutor",
        { messages: history, model, temperature: supportsTemperature(model) ? temperature : null, lessonSlug },
        abort.signal,
        (e) => {
          if (e.type === "text") {
            reply += e.text;
            setMessages([...history, { role: "assistant", content: reply }]);
          } else if (e.type === "done") {
            setLast(e);
            setSpent((s) => s + e.costUsd);
          } else if (e.type === "error") setError(e.error);
        },
      );
    } catch (err) {
      if (!abort.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      // Lesson 4: Claude's reply joins the list as an assistant message. An empty or failed reply
      // is dropped, together with its question, so the list still alternates user/assistant.
      setMessages(reply ? [...history, { role: "assistant", content: reply }] : messages);
      if (!reply) setInput(text);
      setStreaming(false);
    }
  }

  function clear() {
    abortRef.current?.abort();
    setMessages([]);
    setLast(null);
    setError(null);
  }

  const canTemp = supportsTemperature(model);

  return (
    <>
      {!open && (
        <button className="tutor-fab" onClick={() => setOpen(true)} aria-label="Open the course tutor">
          Ask the course tutor
        </button>
      )}

      {open && (
        <aside className="tutor" aria-label="Course tutor">
          <div className="tutor-head">
            <strong>Course tutor</strong>
            <span className="muted">{lessonSlug ? `Lesson ${parseInt(lessonSlug, 10)}` : "Course"}</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <button className="link" onClick={() => setSettings((s) => !s)}>{settings ? "Chat" : "Settings"}</button>
              <button className="link" onClick={clear} disabled={messages.length === 0}>Clear</button>
              <button className="link" onClick={() => setOpen(false)} aria-label="Close">Close</button>
            </span>
          </div>

          {settings ? (
            <div className="tutor-body">
              <label className="field" htmlFor="tutor-model">Model</label>
              <select id="tutor-model" value={model} onChange={(e) => setModel(e.target.value)}>
                {MODELS.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
              </select>

              <label className="field" htmlFor="tutor-temp" style={{ marginTop: 12 }}>
                Temperature: {canTemp ? (temperature === null ? "not sent (API default 1)" : temperature.toFixed(1)) : "not supported by this model"}
              </label>
              <input
                id="tutor-temp"
                type="range"
                min={0}
                max={1}
                step={0.1}
                disabled={!canTemp}
                value={temperature ?? 1}
                onChange={(e) => setTemperature(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              {canTemp && temperature !== null && <button className="link" onClick={() => setTemperature(null)}>Don&apos;t send temperature</button>}

              <p className="muted">
                Every question sends the whole conversation ({messages.length} message{messages.length === 1 ? "" : "s"} now) plus a
                system prompt with notes on every lesson, and which page you&apos;re on. The system prompt is cached, so
                repeat questions cost less. Spent in this chat: <b>{formatUsd(spent)}</b>.
              </p>
              <p className="muted">Code: <code>app/courses/building-with-the-claude-api/CourseTutor.tsx</code> and <code>lib/courses/building-with-the-claude-api/tutor.ts</code>.</p>
            </div>
          ) : (
            <>
              <div className="tutor-body tutor-list" ref={listRef}>
                {messages.length === 0 && (
                  <p className="muted">
                    Ask anything about this course: a concept, the TypeScript version of a Python snippet, or why something
                    on this page behaves the way it does.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`tutor-msg tutor-${m.role}`}>
                    {m.role === "assistant" ? <Reply text={m.content || "…"} /> : m.content}
                    {streaming && i === messages.length - 1 && m.role === "assistant" ? " ▍" : ""}
                  </div>
                ))}
                {error && <p className="error">{error}</p>}
                {last && !streaming && (
                  <p className="muted" style={{ margin: 0 }}>
                    {model} · {(last.ms / 1000).toFixed(1)}s · {formatUsd(last.costUsd)}
                    {last.cacheReadTokens > 0 ? ` · ${last.cacheReadTokens} tokens from cache` : ""}
                    {last.stopReason === "max_tokens" ? " · cut off (max_tokens)" : ""}
                  </p>
                )}
              </div>
              <div className="tutor-input">
                <textarea
                  rows={2}
                  placeholder="Ask a question (Enter to send, Shift+Enter for a new line)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                {streaming ? (
                  <button className="run" onClick={() => abortRef.current?.abort()}>Stop</button>
                ) : (
                  <button className="run" onClick={send} disabled={!input.trim()}>Send</button>
                )}
              </div>
            </>
          )}
        </aside>
      )}
    </>
  );
}
