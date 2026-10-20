"use client";

import { useEffect, useState } from "react";
import {
  ACTIVITY_LOGS,
  ATTACH_SNIPPET,
  LESSON_8_MODEL,
  LESSON_8_MODELS,
  UPLOAD_SNIPPET,
} from "@/lib/courses/claude-platform-101/lesson-08";
import type { SkillFile } from "@/lib/claude/skills";
import type { ServerToolsResult } from "@/lib/claude/server-tools";
import { BlockList } from "@/components/ContentBlocks";
import { formatUsd } from "@/components/ResultCard";

type Uploaded = { id: string; display_name: string; latest_version_id: string; updated_at: string; versions: number };
type Run = { label: string; result?: ServerToolsResult; error?: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

const SKILLS_URL = "/api/claude-platform-101/lesson-08/skills";

export function SkillsDemo() {
  // --- the Skill ---
  const [files, setFiles] = useState<SkillFile[]>([]);
  const [openFile, setOpenFile] = useState("SKILL.md");
  const [skillMd, setSkillMd] = useState("");
  const [uploaded, setUploaded] = useState<Uploaded[]>([]);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [skillError, setSkillError] = useState<string | null>(null);

  // --- the report ---
  const [log, setLog] = useState(ACTIVITY_LOGS[0].log);
  const [model, setModel] = useState(LESSON_8_MODEL);
  const [compare, setCompare] = useState(true);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);

  const original = files.find((f) => f.path === "SKILL.md")?.content ?? "";
  const edited = skillMd !== original;

  function applyUploaded(list: Uploaded[], prefer?: string) {
    setUploaded(list);
    setSkillId((cur) => prefer ?? (list.some((s) => s.id === cur) ? cur : list[0]?.id ?? null));
  }

  useEffect(() => {
    api<{ files: SkillFile[]; uploaded: Uploaded[] }>(SKILLS_URL)
      .then((d) => {
        setFiles(d.files);
        setSkillMd(d.files.find((f) => f.path === "SKILL.md")?.content ?? "");
        applyUploaded(d.uploaded);
      })
      .catch((e) => setSkillError(e.message));
  }, []);

  async function skillAction(label: string, run: () => Promise<{ uploaded: Uploaded[]; created?: string }>) {
    setBusy(label);
    setSkillError(null);
    try {
      const d = await run();
      applyUploaded(d.uploaded, d.created);
    } catch (e) {
      setSkillError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const post = (body: object) =>
    api<{ uploaded: Uploaded[]; created?: string }>(SKILLS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  async function generate() {
    setRunning(true);
    const targets: { label: string; skillId: string | null }[] = [
      { label: "With the Skill", skillId },
      ...(compare ? [{ label: "Without the Skill (same prompt, no container)", skillId: null }] : []),
    ];
    setRuns(targets.map((t) => ({ label: t.label })));
    await Promise.all(
      targets.map(async (t, i) => {
        try {
          const result = await api<ServerToolsResult>("/api/claude-platform-101/lesson-08/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ skillId: t.skillId, log, model }),
          });
          setRuns((cur) => cur.map((r, j) => (j === i ? { ...r, result } : r)));
        } catch (e) {
          setRuns((cur) => cur.map((r, j) => (j === i ? { ...r, error: e instanceof Error ? e.message : String(e) } : r)));
        }
      }),
    );
    setRunning(false);
  }

  const shown = files.find((f) => f.path === openFile);

  return (
    <>
      <h2>1. The Skill: upload once</h2>
      <section className="panel">
        <p className="muted" style={{ marginTop: 0 }}>
          Folder <code>skills/status-report-generator/</code> in this project. Only the name and description (the
          frontmatter) load at first; Claude reads the rest when it decides the Skill is relevant.
        </p>
        <div className="tabs">
          {files.map((f) => (
            <button key={f.path} className="tab" aria-selected={openFile === f.path} onClick={() => setOpenFile(f.path)}>
              {f.path}{f.path === "SKILL.md" && edited ? " (edited)" : ""}
            </button>
          ))}
        </div>
        {openFile === "SKILL.md" ? (
          <>
            <textarea rows={14} value={skillMd} onChange={(e) => setSkillMd(e.target.value)} />
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Edit the procedure here, upload it as a new version, and generate again to see the output change.
              {edited && <> · <button className="link" onClick={() => setSkillMd(original)}>Reset to the file on disk</button></>}
            </p>
          </>
        ) : (
          <pre>{shown?.content}</pre>
        )}

        <div className="row">
          <button className="run" disabled={!!busy || files.length === 0} onClick={() => skillAction("create", () => post({ action: "create", skillMd }))}>
            {busy === "create" ? "Uploading…" : "Upload as a new Skill"}
          </button>
          <button className="run secondary" disabled={!!busy || !skillId} onClick={() => skillAction("version", () => post({ action: "version", skillId, skillMd }))}>
            {busy === "version" ? "Uploading…" : "Upload as new version of selected"}
          </button>
        </div>
        <details>
          <summary>Upload code</summary>
          <pre>{UPLOAD_SNIPPET}</pre>
        </details>
      </section>

      <section className="panel table-wrap">
        <div className="result-head"><strong>Custom Skills in your workspace</strong></div>
        {uploaded.length === 0 ? (
          <p className="muted">None yet. Upload the Skill above.</p>
        ) : (
          <table>
            <thead><tr><th>Use</th><th>Name</th><th>Skill ID</th><th className="num">Versions</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {uploaded.map((s) => (
                <tr key={s.id}>
                  <td><input type="radio" name="skill" checked={skillId === s.id} onChange={() => setSkillId(s.id)} /></td>
                  <td>{s.display_name}</td>
                  <td><code>{s.id}</code></td>
                  <td className="num">{s.versions}</td>
                  <td className="muted">{new Date(s.updated_at).toLocaleString()}</td>
                  <td>
                    <button className="link" disabled={!!busy} onClick={() => skillAction(`delete-${s.id}`, () => api(`${SKILLS_URL}?id=${s.id}`, { method: "DELETE" }))}>
                      {busy === `delete-${s.id}` ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {skillError && <p className="error">{skillError}</p>}
      </section>

      <h2>2. Attach it to a request</h2>
      <section className="panel">
        <div className="tabs">
          {ACTIVITY_LOGS.map((l) => (
            <button key={l.label} className="tab" aria-selected={log === l.log} onClick={() => setLog(l.log)}>{l.label}</button>
          ))}
        </div>
        <label className="field" htmlFor="sk-log">Activity log (passed at request time)</label>
        <textarea id="sk-log" rows={9} value={log} onChange={(e) => setLog(e.target.value)} />
        <details>
          <summary>The request (container.skills + code execution)</summary>
          <pre>{ATTACH_SNIPPET}</pre>
        </details>
        <div className="row">
          <div className="grow">
            <label className="field" htmlFor="sk-model">Model</label>
            <select id="sk-model" value={model} onChange={(e) => setModel(e.target.value)}>
              {LESSON_8_MODELS.map((m) => <option key={m} value={m}>{m}{m === LESSON_8_MODEL ? " (used in lesson 8)" : ""}</option>)}
            </select>
          </div>
          <label className="checks" style={{ alignSelf: "center" }}>
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Also run without the Skill
          </label>
          <button className="run" disabled={running || !skillId} onClick={generate}>
            {running ? "Generating…" : skillId ? "Generate report" : "Upload a Skill first"}
          </button>
        </div>
      </section>

      {runs.length > 0 && (
        <div className="compare-grid">
          {runs.map((r) => (
            <section key={r.label} className="panel">
              <div className="result-head"><strong>{r.label}</strong></div>
              {!r.result && !r.error && <p className="muted">Working… (a Skill run takes longer: Claude reads the Skill and runs its script)</p>}
              {r.error && <p className="error">{r.error}</p>}
              {r.result && (
                <>
                  <div className="meta">
                    <span>time: <b>{(r.result.ms / 1000).toFixed(1)}s</b></span>
                    <span>tokens: <b>{r.result.inputTokens.toLocaleString()}</b> in / <b>{r.result.outputTokens.toLocaleString()}</b> out</span>
                    <span>cost: <b>{formatUsd(r.result.costUsd)}</b></span>
                    <span>stop: <b>{r.result.stopReason}</b></span>
                  </div>
                  <div className="answer">
                    {r.result.blocks.filter((b) => b.type === "text").map((b) => (b.type === "text" ? b.text : "")).join("").trim()}
                  </div>
                </>
              )}
            </section>
          ))}
        </div>
      )}

      {runs[0]?.result && (
        <>
          <h2>What happened inside the Skill run</h2>
          <p className="muted">Look for Claude reading SKILL.md and template.md, then running scripts/log_stats.py in the container.</p>
          <BlockList blocks={runs[0].result.blocks} />
        </>
      )}
    </>
  );
}
