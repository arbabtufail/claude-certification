// Shows one Claude response: the answer, what it cost, and the raw response object.
import type { SendResult } from "@/lib/claude/send";
import { getModel } from "@/lib/claude/models";

export function formatUsd(n: number): string {
  return n < 0.01 ? `$${n.toFixed(5)}` : `$${n.toFixed(4)}`;
}

export function ResultCard({ result, title }: { result: SendResult; title?: string }) {
  const model = getModel(result.model);

  return (
    <section className="panel">
      <div className="result-head">
        <strong>{title ?? result.model}</strong>
        {model && <span className="badge">{model.tier}</span>}
      </div>

      <div className="meta">
        <span>time: <b>{(result.ms / 1000).toFixed(2)}s</b></span>
        <span>input: <b>{result.inputTokens}</b></span>
        <span>output: <b>{result.outputTokens}</b>{result.thinkingTokens > 0 && ` (${result.thinkingTokens} thinking)`}</span>
        <span>cost: <b>{formatUsd(result.costUsd)}</b></span>
        <span>stop_reason: <b>{result.stopReason}</b></span>
      </div>

      <div className="answer">
        {result.stopReason === "refusal" ? "Claude declined this request (stop_reason: refusal)." : result.text}
      </div>
      {result.stopReason === "max_tokens" && (
        <p className="warn">Hit the max_tokens cap, so the answer was cut off. Raise max_tokens and try again.</p>
      )}

      <details>
        <summary>Raw response (content is an array of blocks)</summary>
        <pre>{JSON.stringify(result.raw, null, 2)}</pre>
      </details>
    </section>
  );
}
