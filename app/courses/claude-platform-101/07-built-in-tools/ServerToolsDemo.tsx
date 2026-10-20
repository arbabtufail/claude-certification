"use client";

import { useState } from "react";
import {
  CLIENT_TOOLS,
  DEMOS,
  LESSON_7_MAX_TOKENS,
  LESSON_7_MODEL,
  LESSON_7_MODELS,
  LESSON_7_SNIPPET,
  SEARCH_VERSIONS,
  toolsFor,
  type DemoId,
  type SearchVersion,
} from "@/lib/courses/claude-platform-101/lesson-07";
import type { ServerToolsResult } from "@/lib/claude/server-tools";
import { AnswerWithCitations, BlockList } from "@/components/ContentBlocks";
import { formatUsd } from "@/components/ResultCard";

type Tab = DemoId | "client";

export function ServerToolsDemo() {
  const [tab, setTab] = useState<Tab>("search");
  const [prompt, setPrompt] = useState(DEMOS.search.samples[0].prompt);
  const [model, setModel] = useState(LESSON_7_MODEL);
  const [maxTokens, setMaxTokens] = useState(LESSON_7_MAX_TOKENS);
  const [searchVersion, setSearchVersion] = useState<SearchVersion>("web_search_20260209");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ServerToolsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickTab(t: Tab) {
    setTab(t);
    if (t !== "client") setPrompt(DEMOS[t].samples[0].prompt);
    setResult(null);
    setError(null);
  }

  async function run() {
    if (tab === "client") return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/claude-platform-101/lesson-07/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: tab, prompt, model, maxTokens, searchVersion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const demo = tab === "client" ? null : DEMOS[tab];

  return (
    <>
      <div className="tabs">
        {(Object.keys(DEMOS) as DemoId[]).map((id) => (
          <button key={id} className="tab" aria-selected={tab === id} onClick={() => pickTab(id)}>
            {DEMOS[id].label}
          </button>
        ))}
        <button className="tab" aria-selected={tab === "client"} onClick={() => pickTab("client")}>
          Client tools (memory, bash)
        </button>
      </div>

      {demo && (
        <section className="panel">
          <p className="muted" style={{ marginTop: 0 }}>{demo.what}</p>
          <div className="tabs">
            {demo.samples.map((s) => (
              <button key={s.label} className="tab" aria-selected={prompt === s.prompt} onClick={() => setPrompt(s.prompt)}>
                {s.label}
              </button>
            ))}
          </div>
          <label className="field" htmlFor="st-prompt">Prompt</label>
          <textarea id="st-prompt" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

          {tab === "search" && (
            <fieldset style={{ marginTop: 12 }}>
              <legend className="field">Web search version</legend>
              {(Object.keys(SEARCH_VERSIONS) as SearchVersion[]).map((v) => (
                <label key={v} className="radio">
                  <input type="radio" name="search-version" checked={searchVersion === v} onChange={() => setSearchVersion(v)} />
                  <span><code>{SEARCH_VERSIONS[v].label}</code> <span className="muted">· {SEARCH_VERSIONS[v].help}</span></span>
                </label>
              ))}
            </fieldset>
          )}

          <details>
            <summary>tools array sent with this request</summary>
            <pre>{JSON.stringify(toolsFor(tab as DemoId, searchVersion), null, 2)}</pre>
          </details>
          <details>
            <summary>The lesson&apos;s code (two calls, no loop)</summary>
            <pre>{LESSON_7_SNIPPET}</pre>
          </details>

          <div className="row">
            <div className="grow">
              <label className="field" htmlFor="st-model">Model</label>
              <select id="st-model" value={model} onChange={(e) => setModel(e.target.value)}>
                {LESSON_7_MODELS.map((m) => (
                  <option key={m} value={m}>{m}{m === LESSON_7_MODEL ? " (used in lesson 7)" : ""}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 150 }}>
              <label className="field" htmlFor="st-max">max_tokens</label>
              <input id="st-max" type="number" min={256} max={16000} step={256} value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))} />
            </div>
            <button className="run" onClick={run} disabled={loading}>
              {loading ? "Anthropic is running the tool…" : "Send one request"}
            </button>
          </div>
        </section>
      )}

      {tab === "client" && (
        <section className="panel">
          <p style={{ marginTop: 0 }}>
            Client tools have schemas Anthropic publishes and trains Claude on, so you don&apos;t write the schema. But
            unlike server tools, <b>your code runs them</b>, with the same tool_use / tool_result loop as lesson 4.
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Declare as</th><th>What it does</th><th>Who runs it</th></tr></thead>
              <tbody>
                {CLIENT_TOOLS.map((t) => (
                  <tr key={t.type}>
                    <td><code>{`{ type: "${t.type}", name: "${t.name}" }`}</code></td>
                    <td className="wrap">{t.what}</td>
                    <td className="wrap">{t.whoRuns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Compare: server tools (web search, web fetch, code execution) are declared the same way, but Anthropic runs
            them and the result is already inside the response.
          </p>
        </section>
      )}

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
              <span>API calls: <b>{result.apiCalls}</b>{result.apiCalls > 1 && " (resumed after pause_turn)"}</span>
              <span>tokens: <b>{result.inputTokens.toLocaleString()}</b> in / <b>{result.outputTokens.toLocaleString()}</b> out</span>
              {result.webSearches > 0 && <span>web searches: <b>{result.webSearches}</b></span>}
              {result.webFetches > 0 && <span>web fetches: <b>{result.webFetches}</b></span>}
              <span>
                cost: <b>{formatUsd(result.costUsd)}</b>
                {result.searchCostUsd > 0 && ` (tokens ${formatUsd(result.tokenCostUsd)} + searches ${formatUsd(result.searchCostUsd)})`}
              </span>
            </div>
            {result.stopReason === "max_tokens" && <p className="warn">Hit max_tokens: raise it and run again.</p>}
            <AnswerWithCitations blocks={result.blocks} />
            <p className="muted" style={{ marginBottom: 0 }}>
              Web results can be wrong too. Always double-check Claude&apos;s work.
            </p>
          </section>

          <h2>Every block in the response</h2>
          <p className="muted">
            No agent loop ran on our side. The tool calls and their results are already in <code>response.content</code>.
          </p>
          <BlockList blocks={result.blocks} />

          <details>
            <summary>Raw response blocks (JSON)</summary>
            <pre>{JSON.stringify(result.blocks, null, 2)}</pre>
          </details>
        </>
      )}
    </>
  );
}
