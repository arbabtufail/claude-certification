"use client";

import { useState } from "react";
import { MODELS } from "@/lib/claude/models";
import { COURSE_MODEL, supportsPrefill } from "@/lib/courses/building-with-the-claude-api/capabilities";
import { postChat } from "@/lib/courses/building-with-the-claude-api/client-api";
import type { ChatMessage } from "@/lib/courses/building-with-the-claude-api/conversation";
import { PRESETS, type Lesson8Mode, type Lesson8Preset } from "@/lib/courses/building-with-the-claude-api/lesson-08";
import { formatUsd } from "@/components/ResultCard";

const MODES: { id: Lesson8Mode; label: string; help: string }[] = [
  { id: "plain", label: "Plain request", help: "Just the user message. Claude adds a code fence and an explanation." },
  { id: "prefill", label: "Prefill + stop sequence (lesson)", help: "Works on claude-sonnet-4-5 and claude-haiku-4-5 only." },
  { id: "structured", label: "Structured outputs (current models)", help: "The replacement for prefill on newer models. JSON preset only." },
];

type Output = { text: string; note: string; ok: boolean; cost: number; stop?: string };

export function StructuredDataDemo() {
  const [preset, setPreset] = useState<Lesson8Preset>(PRESETS[0]);
  const [mode, setMode] = useState<Lesson8Mode>("prefill");
  const [model, setModel] = useState(COURSE_MODEL);
  const [prompt, setPrompt] = useState(PRESETS[0].prompt);
  const [prefill, setPrefill] = useState(PRESETS[0].prefill);
  const [stop, setStop] = useState(PRESETS[0].stop);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function choosePreset(p: Lesson8Preset) {
    setPreset(p);
    setPrompt(p.prompt);
    setPrefill(p.prefill);
    setStop(p.stop);
    if (mode === "structured" && p.parse !== "json") setMode("prefill");
    setOut(null);
  }

  function chooseMode(m: Lesson8Mode) {
    setMode(m);
    setOut(null);
    setError(null);
    if (m === "structured" && !MODELS.some((x) => x.id === model && !supportsPrefill(x.id))) setModel("claude-opus-5-5");
    if (m === "prefill" && !supportsPrefill(model)) setModel(COURSE_MODEL);
  }

  // Lesson's cleanup step: strip whitespace, then parse.
  function check(text: string): { note: string; ok: boolean } {
    if (preset.parse !== "json") return { note: "", ok: true };
    try {
      JSON.parse(text.trim());
      return { note: "JSON.parse(text.trim()) succeeded", ok: true };
    } catch {
      return { note: "JSON.parse failed: the reply isn't raw JSON", ok: false };
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setOut(null);
    setCopied(false);
    try {
      if (mode === "structured") {
        const res = await fetch("/api/building-with-the-claude-api/structured", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        const text = data.rule ? JSON.stringify(data.rule, null, 2) : data.rawText;
        setOut({ text, cost: data.costUsd, stop: data.stopReason, ...(data.rule ? { note: "parsed_output matched the schema", ok: true } : { note: "parsed_output was null", ok: false }) });
      } else {
        const messages: ChatMessage[] = [{ role: "user", content: prompt }];
        if (mode === "prefill") messages.push({ role: "assistant", content: prefill });
        const r = await postChat({ model, messages, stopSequences: mode === "prefill" && stop ? [stop] : undefined });
        // With prefill, the reply is the continuation AFTER the prefilled text.
        const text = mode === "prefill" ? r.text.trim() : r.text;
        setOut({ text, cost: r.costUsd, stop: r.stopSequence ? `stop_sequence (${r.stopSequence})` : r.stopReason ?? "", ...check(text) });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const modelChoices = MODELS.filter((m) => (mode === "structured" ? !supportsPrefill(m.id) : true));

  return (
    <>
      <section className="panel">
        <div className="tabs">
          {PRESETS.map((p) => (
            <button key={p.id} className="tab" aria-selected={preset.id === p.id} onClick={() => choosePreset(p)}>{p.label}</button>
          ))}
        </div>

        <fieldset>
          <legend className="field">Technique</legend>
          {MODES.map((m) => (
            <label key={m.id} className="radio">
              <input
                type="radio"
                name="l8-mode"
                checked={mode === m.id}
                disabled={m.id === "structured" && preset.parse !== "json"}
                onChange={() => chooseMode(m.id)}
              />
              <span>{m.label}<br /><span className="muted">{m.help}</span></span>
            </label>
          ))}
        </fieldset>

        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="l8-prompt">User message</label>
            <input id="l8-prompt" className="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
        </div>
        {mode === "prefill" && (
          <div className="row">
            <div className="grow">
              <label className="field" htmlFor="l8-prefill">Prefilled assistant message</label>
              <input id="l8-prefill" className="text" value={prefill} onChange={(e) => setPrefill(e.target.value)} />
            </div>
            <div className="grow">
              <label className="field" htmlFor="l8-stop">stop_sequences</label>
              <input id="l8-stop" className="text" value={stop} onChange={(e) => setStop(e.target.value)} />
            </div>
          </div>
        )}
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="l8-model">Model</label>
            <select id="l8-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {modelChoices.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}{m.id === COURSE_MODEL ? " (course)" : ""}{mode === "prefill" && !supportsPrefill(m.id) ? " (rejects prefill)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button className="run" onClick={generate} disabled={busy || !prompt.trim() || (mode === "prefill" && !prefill)}>
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}

      {out && (
        <section className="panel">
          <div className="result-head">
            <strong>{MODES.find((m) => m.id === mode)!.label}</strong>
            <button className="run secondary" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <div className="meta">
            {out.stop && <span>stopped by: <b>{out.stop}</b></span>}
            <span>cost: <b>{formatUsd(out.cost)}</b></span>
            {out.note && <span className={out.ok ? "verdict-ok" : "verdict-bad"}>{out.note}</span>}
          </div>
          <pre style={{ margin: 0 }}>{out.text}</pre>
        </section>
      )}

      <h2>The code</h2>
      <pre>{mode === "structured"
        ? `import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const EventPattern = z.object({
  source: z.array(z.string()),
  detail_type: z.array(z.string()),
  detail: z.array(z.object({ field: z.string(), values: z.array(z.string()) })),
});

const response = await client.messages.parse({
  model: "${model}",
  max_tokens: 2000,
  messages: [{ role: "user", content: ${JSON.stringify(prompt)} }],
  output_config: { format: zodOutputFormat(EventPattern) },
});
const rule = response.parsed_output; // already validated against the schema`
        : `const messages: Anthropic.MessageParam[] = [];
addUserMessage(messages, ${JSON.stringify(prompt)});${mode === "prefill" ? `
addAssistantMessage(messages, ${JSON.stringify(prefill)}); // Claude thinks it already opened the block` : ""}

const text = await chat(messages${mode === "prefill" ? `, { stopSequences: [${JSON.stringify(stop)}] }` : ""});${preset.parse === "json" ? `
const rule = JSON.parse(text.trim());` : ""}`}</pre>
      <p className="muted">
        Code: <code>lib/courses/building-with-the-claude-api/helpers.ts</code> (prefill) and{" "}
        <code>lesson-08-server.ts</code> (structured outputs).
      </p>
    </>
  );
}
