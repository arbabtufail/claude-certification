"use client";

import { useEffect, useState } from "react";
import {
  COMPARISON,
  FILTER_SNIPPET,
  LESSON_9_MAX_TOKENS,
  LESSON_9_MODEL,
  LESSON_9_MODELS,
  LESSON_9_SNIPPET,
  PRESETS,
  type PresetId,
  type ServerChoice,
} from "@/lib/courses/claude-platform-101/lesson-09";
import type { McpResult, McpTool } from "@/lib/claude/mcp";
import { AnswerWithCitations, BlockList } from "@/components/ContentBlocks";
import { formatUsd } from "@/components/ResultCard";

async function api<T>(url: string, body?: object): Promise<T> {
  const res = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

const BASE = "/api/claude-platform-101/lesson-09";

export function McpDemo() {
  const [preset, setPreset] = useState<PresetId>("deepwiki");
  const [custom, setCustom] = useState({ name: "myserver", url: "https://", token: "" });
  const [linearReady, setLinearReady] = useState(false);

  const [tools, setTools] = useState<McpTool[] | null>(null);
  const [serverInfo, setServerInfo] = useState("");
  const [listing, setListing] = useState(false);
  const [mode, setMode] = useState<"all" | "allowlist">("all");
  const [allowed, setAllowed] = useState<string[]>([]);

  const [prompt, setPrompt] = useState(PRESETS.deepwiki.samples[0]);
  const [model, setModel] = useState(LESSON_9_MODEL);
  const [maxTokens, setMaxTokens] = useState(LESSON_9_MAX_TOKENS);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<McpResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ linearConfigured: boolean }>(`${BASE}/tools`).then((d) => setLinearReady(d.linearConfigured)).catch(() => {});
  }, []);

  const server: ServerChoice = preset === "custom" ? { preset, ...custom } : { preset };
  const presetInfo = preset === "custom" ? null : PRESETS[preset];

  function pickPreset(p: PresetId) {
    setPreset(p);
    setTools(null);
    setAllowed([]);
    setMode("all");
    setResult(null);
    setError(null);
    if (p !== "custom") setPrompt(PRESETS[p].samples[0]);
  }

  async function discover() {
    setListing(true);
    setError(null);
    try {
      const d = await api<{ serverInfo: string; tools: McpTool[] }>(`${BASE}/tools`, { server });
      setTools(d.tools);
      setServerInfo(d.serverInfo);
      setAllowed(d.tools.slice(0, 1).map((t) => t.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setListing(false);
    }
  }

  async function run() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      setResult(await api<McpResult>(`${BASE}/run`, { server, prompt, model, maxTokens, allowlist: mode === "all" ? null : allowed }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const toggle = (name: string) => setAllowed((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));
  const blocked = preset === "linear" && !linearReady;

  return (
    <>
      <section className="panel table-wrap">
        <table>
          <thead><tr><th>Feature</th><th>Its job</th><th>Who maintains the integration</th></tr></thead>
          <tbody>
            {COMPARISON.map((c) => (
              <tr key={c.feature} className={c.feature === "MCP" ? "highlight" : undefined}>
                <td><b>{c.feature}</b></td><td className="wrap">{c.job}</td><td className="wrap">{c.maintains}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2>1. Pick an MCP server</h2>
      <section className="panel">
        <div className="tabs">
          {(Object.keys(PRESETS) as Exclude<PresetId, "custom">[]).map((p) => (
            <button key={p} className="tab" aria-selected={preset === p} onClick={() => pickPreset(p)}>
              {PRESETS[p].label}{p === "linear" && !linearReady ? " (needs token)" : ""}
            </button>
          ))}
          <button className="tab" aria-selected={preset === "custom"} onClick={() => pickPreset("custom")}>Custom URL</button>
        </div>

        {presetInfo ? (
          <p className="muted" style={{ margin: 0 }}>
            <code>{presetInfo.url}</code> · {presetInfo.about}
          </p>
        ) : (
          <div className="option-grid" style={{ marginTop: 0 }}>
            <div>
              <label className="field" htmlFor="mcp-name">name</label>
              <input id="mcp-name" className="text" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            </div>
            <div>
              <label className="field" htmlFor="mcp-url">url (https, reachable from the internet)</label>
              <input id="mcp-url" className="text" value={custom.url} onChange={(e) => setCustom({ ...custom, url: e.target.value })} />
            </div>
            <div>
              <label className="field" htmlFor="mcp-token">authorization_token (optional)</label>
              <input id="mcp-token" className="text" type="password" value={custom.token} onChange={(e) => setCustom({ ...custom, token: e.target.value })} />
            </div>
          </div>
        )}
        {blocked && <p className="warn">Add <code>LINEAR_MCP_TOKEN=...</code> to <code>.env.local</code> and restart <code>npm run dev</code> to use Linear.</p>}

        <div className="row">
          <button className="run secondary" onClick={discover} disabled={listing || blocked}>
            {listing ? "Listing…" : "List the server's tools"}
          </button>
          <span className="muted">Calls the server&apos;s <code>tools/list</code> directly. No Claude call, no tokens.</span>
        </div>

        {tools && (
          <>
            <p className="muted">{serverInfo} exposes {tools.length} tool{tools.length === 1 ? "" : "s"}. You wrote none of these schemas.</p>
            <fieldset>
              <legend className="field">Which tools may Claude use? (mcp_toolset)</legend>
              <label className="radio">
                <input type="radio" name="mode" checked={mode === "all"} onChange={() => setMode("all")} />
                <span><b>All tools</b> <span className="muted">· the default: just <code>{"{ type: \"mcp_toolset\", mcp_server_name }"}</code></span></span>
              </label>
              <label className="radio">
                <input type="radio" name="mode" checked={mode === "allowlist"} onChange={() => setMode("allowlist")} />
                <span><b>Only the ticked tools</b> <span className="muted">· <code>default_config: {"{ enabled: false }"}</code> + <code>configs</code></span></span>
              </label>
            </fieldset>
            <div className="tool-list">
              {tools.map((t) => (
                <label key={t.name} className={`tool-item${mode === "all" ? " disabled" : ""}`}>
                  <input type="checkbox" disabled={mode === "all"} checked={mode === "all" || allowed.includes(t.name)} onChange={() => toggle(t.name)} />
                  <span>
                    <code>{t.name}</code>({t.params.join(", ")})
                    <br /><span className="muted">{t.description.slice(0, 180)}{t.description.length > 180 ? "…" : ""}</span>
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
        <details>
          <summary>How filtering looks in code</summary>
          <pre>{FILTER_SNIPPET}</pre>
        </details>
      </section>

      <h2>2. Ask Claude</h2>
      <section className="panel">
        {presetInfo && (
          <div className="tabs">
            {presetInfo.samples.map((s, i) => (
              <button key={i} className="tab" aria-selected={prompt === s} onClick={() => setPrompt(s)}>
                {i === 0 ? "Lesson prompt" : `Sample ${i}`}
              </button>
            ))}
          </div>
        )}
        <label className="field" htmlFor="mcp-prompt">Prompt</label>
        <textarea id="mcp-prompt" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <details>
          <summary>The lesson&apos;s request</summary>
          <pre>{LESSON_9_SNIPPET}</pre>
        </details>
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="mcp-model">Model</label>
            <select id="mcp-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {LESSON_9_MODELS.map((m) => <option key={m} value={m}>{m}{m === LESSON_9_MODEL ? " (used in lesson 9)" : ""}</option>)}
            </select>
          </div>
          <div style={{ width: 150 }}>
            <label className="field" htmlFor="mcp-max">max_tokens</label>
            <input id="mcp-max" type="number" min={256} max={16000} step={256} value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} />
          </div>
          <button className="run" onClick={run} disabled={running || blocked || (mode === "allowlist" && allowed.length === 0)}>
            {running ? "Claude is using the MCP server…" : "Send"}
          </button>
        </div>
        {mode === "allowlist" && <p className="muted" style={{ margin: "6px 0 0" }}>Allowed: {allowed.length ? allowed.join(", ") : "none (tick at least one)"}</p>}
      </section>

      {error && <section className="panel error">{error}</section>}

      {result && (
        <>
          <section className="panel">
            <div className="result-head">
              <strong>Answer</strong>
              <span className={`pill pill-${result.stopReason}`}>stop_reason: {result.stopReason}</span>
            </div>
            <div className="meta">
              <span>time: <b>{(result.ms / 1000).toFixed(1)}s</b></span>
              <span>MCP tool calls: <b>{result.blocks.filter((b) => b.type === "mcp_tool_use").length}</b></span>
              <span>tokens: <b>{result.inputTokens.toLocaleString()}</b> in / <b>{result.outputTokens.toLocaleString()}</b> out</span>
              <span>cost: <b>{formatUsd(result.costUsd)}</b></span>
            </div>
            {result.stopReason === "max_tokens" && <p className="warn">Hit max_tokens: raise it and send again.</p>}
            <AnswerWithCitations blocks={result.blocks} />
          </section>

          <h2>Every block in the response</h2>
          <p className="muted">Anthropic connected to the server and ran the calls. No agent loop on our side.</p>
          <BlockList blocks={result.blocks} />

          <details>
            <summary>The exact request we sent (token redacted)</summary>
            <pre>{JSON.stringify(result.request, null, 2)}</pre>
          </details>
        </>
      )}
    </>
  );
}
