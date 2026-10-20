// Live view of an agent run: each API call, each tool call, and the final summary.
import type { AgentEvent } from "@/lib/claude/agent-loop";
import { formatUsd } from "@/components/ResultCard";

type Props = {
  events: AgentEvent[];
  running: boolean;
  showJson?: boolean; // show the raw tool_use and tool_result blocks
};

export function AgentTimeline({ events, running, showJson = false }: Props) {
  if (events.length === 0) return null;

  const done = events.find((e) => e.type === "done");
  const last = events.at(-1);
  const waitingTurn = running && last?.type === "request" ? last.turn : null;
  const working = running && !waitingTurn && !done;

  return (
    <>
      <ol className="timeline">
        {events.map((e, i) => {
          if (e.type === "request") {
            return (
              <li key={i} className="step step-request">
                <div className="step-label">Turn {e.turn}: your code calls messages.create</div>
                <div className="muted">Sending {e.messageCount} message{e.messageCount === 1 ? "" : "s"} + the tools array</div>
              </li>
            );
          }
          if (e.type === "response") {
            return (
              <li key={i} className="step step-claude">
                <div className="step-label">
                  Turn {e.turn}: Claude replies <span className={`pill pill-${e.stopReason}`}>stop_reason: {e.stopReason}</span>
                </div>
                <div className="meta">
                  <span>blocks: {e.blockTypes.map((t, j) => <code key={j} className="chip">{t}</code>)}</span>
                  <span>time: <b>{(e.ms / 1000).toFixed(2)}s</b></span>
                  <span>tokens: <b>{e.inputTokens}</b> in / <b>{e.outputTokens}</b> out</span>
                  <span>cost: <b>{formatUsd(e.costUsd)}</b></span>
                </div>
                {e.thinking && (
                  <div className="thinking-box">
                    <div className="thinking-label">Thinking (summary)</div>
                    {e.thinking}
                  </div>
                )}
                {e.text && <div className="answer">{e.text}</div>}
                {e.toolCalls.map((c) => (
                  <div key={c.id} className="tool-call">
                    Requests <code>{c.name}({JSON.stringify(c.input)})</code>
                    {showJson && (
                      <details>
                        <summary>tool_use block</summary>
                        <pre>{JSON.stringify({ type: "tool_use", id: c.id, name: c.name, input: c.input }, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </li>
            );
          }
          if (e.type === "tool_result") {
            return (
              <li key={i} className={`step step-tool${e.isError ? " step-error" : ""}`}>
                <div className="step-label">Your code runs {e.call.name}</div>
                <div>
                  <code>{e.call.name}({JSON.stringify(e.call.input)})</code> →{" "}
                  <span className={e.isError ? "error" : ""}>{e.output}</span>
                </div>
                <div className="muted">
                  Sent back as a tool_result{e.isError ? " with is_error: true" : ""} · {(e.ms / 1000).toFixed(2)}s
                </div>
                {showJson && (
                  <details>
                    <summary>tool_result block (inside a user message)</summary>
                    <pre>
                      {JSON.stringify(
                        { type: "tool_result", tool_use_id: e.call.id, content: e.output, ...(e.isError ? { is_error: true } : {}) },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                )}
              </li>
            );
          }
          return null;
        })}
        {(waitingTurn || working) && (
          <li className="step step-waiting">
            <div className="muted">{waitingTurn ? `Waiting for Claude (turn ${waitingTurn})…` : "Working…"}</div>
          </li>
        )}
      </ol>

      {done && done.type === "done" && (
        <section className="panel">
          <div className="result-head">
            <strong>Loop finished</strong>
            <span className={`pill pill-${done.reason}`}>{done.reason}</span>
          </div>
          <div className="meta">
            <span>API calls: <b>{done.totals.apiCalls}</b></span>
            <span>tool executions: <b>{done.totals.toolCalls}</b></span>
            <span>tokens: <b>{done.totals.inputTokens}</b> in / <b>{done.totals.outputTokens}</b> out</span>
            <span>total cost: <b>{formatUsd(done.totals.costUsd)}</b></span>
            <span>total time: <b>{(done.totals.ms / 1000).toFixed(1)}s</b></span>
          </div>
          {done.reason === "max_turns" && <p className="warn">Stopped at the turn limit before Claude finished.</p>}
          {done.reason === "max_tokens" && <p className="warn">The final answer hit max_tokens and was cut off.</p>}
          {done.reason === "refusal" && <p className="warn">Claude declined this request.</p>}
          <details>
            <summary>Final messages array ({done.messages.length} messages: roles alternate user / assistant)</summary>
            <pre>{JSON.stringify(done.messages, null, 2)}</pre>
          </details>
        </section>
      )}
    </>
  );
}
