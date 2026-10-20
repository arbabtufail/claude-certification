// Renders every block of a Claude response by its type: text (with citations), thinking, server_tool_use,
// and the result blocks server tools return. Unknown types fall back to raw JSON.
import type Anthropic from "@anthropic-ai/sdk";

// Server-tool result blocks have many shapes; read them loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

// Regular and beta (e.g. MCP connector) responses share this renderer.
type AnyBlock = Anthropic.ContentBlock | Anthropic.Beta.Messages.BetaContentBlock;

type Source = { url: string; title: string };

// Collect cited sources once so every text block can point at them by number.
export function collectSources(blocks: AnyBlock[]): Source[] {
  const sources: Source[] = [];
  for (const b of blocks) {
    if (b.type !== "text") continue;
    for (const c of (b.citations ?? []) as Loose[]) {
      if (c.url && !sources.some((s) => s.url === c.url)) sources.push({ url: c.url, title: c.title ?? c.url });
    }
  }
  return sources;
}

// The final answer: all text blocks joined, with [n] markers for citations and a numbered source list.
export function AnswerWithCitations({ blocks }: { blocks: AnyBlock[] }) {
  const sources = collectSources(blocks);
  const texts = blocks.filter((b) => b.type === "text") as Anthropic.TextBlock[];
  if (texts.length === 0) return <p className="muted">No text in the response.</p>;

  return (
    <>
      <div className="answer">
        {texts.map((t, i) => {
          const nums = [...new Set(((t.citations ?? []) as Loose[]).map((c) => sources.findIndex((s) => s.url === c.url) + 1))].filter((n) => n > 0);
          return (
            <span key={i}>
              {t.text}
              {nums.map((n) => (
                <sup key={n} className="cite"><a href={sources[n - 1].url} target="_blank" rel="noreferrer">[{n}]</a></sup>
              ))}
            </span>
          );
        })}
      </div>
      {sources.length > 0 && (
        <ol className="sources">
          {sources.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>
          ))}
        </ol>
      )}
    </>
  );
}

function codeOf(input: Loose): string | null {
  if (typeof input.code === "string") return input.code;
  if (typeof input.command === "string" && !input.path) return input.command; // bash command
  if (typeof input.file_text === "string") return `# ${input.command ?? "create"} ${input.path}\n${input.file_text}`;
  return null;
}

function ResultBody({ block }: { block: Loose }) {
  const c: Loose = block.content ?? {};

  // Errors come back inside the block (HTTP 200), not as exceptions.
  if (typeof c.type === "string" && c.type.endsWith("_error")) {
    return <div className="error">Error: <code>{c.error_code}</code></div>;
  }

  if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
    return (
      <ol className="sources">
        {(block.content as Loose[]).map((r, i) => (
          <li key={i}>
            <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
            {r.page_age && <span className="muted"> · {r.page_age}</span>}
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "web_fetch_tool_result") {
    const doc: Loose = c.content ?? {};
    const text = typeof doc.source?.data === "string" && doc.source?.type === "text" ? doc.source.data : null;
    return (
      <>
        <div><a href={c.url} target="_blank" rel="noreferrer">{doc.title ?? c.url}</a>{c.retrieved_at && <span className="muted"> · retrieved {c.retrieved_at}</span>}</div>
        {text ? <pre>{text.slice(0, 1500)}{text.length > 1500 ? `\n… (${text.length.toLocaleString()} characters in total)` : ""}</pre>
              : <div className="muted">Fetched content type: {doc.source?.media_type ?? doc.source?.type ?? "unknown"}</div>}
      </>
    );
  }

  if ("stdout" in c || "stderr" in c) {
    return (
      <>
        <div className="muted">return_code: <b>{c.return_code}</b></div>
        {c.stdout && <pre>{c.stdout}</pre>}
        {c.stderr && <pre className="error">{c.stderr}</pre>}
      </>
    );
  }

  if (typeof c.content === "string") return <pre>{c.content}</pre>; // text editor "view"
  return <pre>{JSON.stringify(c, null, 2)}</pre>;
}

export function BlockList({ blocks }: { blocks: AnyBlock[] }) {
  return (
    <ol className="timeline">
      {blocks.map((block, i) => {
        const b = block as unknown as Loose;
        if (b.type === "text") {
          return (
            <li key={i} className="step step-claude">
              <div className="step-label"><code className="chip">text</code>{b.citations?.length ? ` · ${b.citations.length} citation(s)` : ""}</div>
              <div className="answer">{b.text}</div>
            </li>
          );
        }
        if (b.type === "thinking") {
          return (
            <li key={i} className="step step-request">
              <div className="step-label"><code className="chip">thinking</code></div>
              <div className="muted">{b.thinking || "(reasoning hidden: display defaults to omitted)"}</div>
            </li>
          );
        }
        if (b.type === "server_tool_use") {
          const code = codeOf(b.input ?? {});
          return (
            <li key={i} className="step step-claude">
              <div className="step-label"><code className="chip">server_tool_use</code> Claude calls <code>{b.name}</code> (Anthropic runs it)</div>
              {code ? <pre>{code}</pre> : <code>{JSON.stringify(b.input)}</code>}
            </li>
          );
        }
        if (b.type === "mcp_tool_use") {
          return (
            <li key={i} className="step step-claude">
              <div className="step-label">
                <code className="chip">mcp_tool_use</code> Claude calls <code>{b.name}</code> on MCP server <code>{b.server_name}</code>
              </div>
              <code>{JSON.stringify(b.input)}</code>
            </li>
          );
        }
        if (b.type === "mcp_tool_result") {
          const out = typeof b.content === "string" ? b.content : (b.content as Loose[]).map((t) => t.text ?? "").join("\n");
          return (
            <li key={i} className={`step step-tool${b.is_error ? " step-error" : ""}`}>
              <div className="step-label"><code className="chip">mcp_tool_result</code> answer from the MCP server{b.is_error ? " (error)" : ""}</div>
              <pre className={b.is_error ? "error" : undefined}>{out.slice(0, 3000)}{out.length > 3000 ? `\n… (${out.length.toLocaleString()} characters in total)` : ""}</pre>
            </li>
          );
        }
        if (b.type === "mcp_tool_listing") {
          return (
            <li key={i} className="step step-request">
              <div className="step-label"><code className="chip">mcp_tool_listing</code> tools discovered on <code>{b.mcp_server_name}</code></div>
              <div>{(b.tools as Loose[]).map((t) => <code key={t.name} className="chip">{t.name}</code>)}</div>
            </li>
          );
        }
        if (typeof b.type === "string" && b.type.endsWith("_tool_result")) {
          return (
            <li key={i} className="step step-tool">
              <div className="step-label"><code className="chip">{b.type}</code> result from Anthropic&apos;s servers</div>
              <ResultBody block={b} />
            </li>
          );
        }
        return (
          <li key={i} className="step">
            <div className="step-label"><code className="chip">{b.type}</code></div>
            <pre>{JSON.stringify(b, null, 2)}</pre>
          </li>
        );
      })}
    </ol>
  );
}
