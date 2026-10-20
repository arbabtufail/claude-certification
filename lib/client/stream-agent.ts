// BROWSER SIDE: POST to an agent route and read its server-sent events as they arrive.
import type { AgentStreamEvent } from "@/lib/claude/agent-loop";

export async function streamAgent<E = AgentStreamEvent>(
  url: string,
  body: unknown,
  signal: AbortSignal,
  onEvent: (event: E) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }

  // Each event is "data: {json}\n\n". A network chunk can hold several events or half of one.
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      if (chunk.startsWith("data: ")) onEvent(JSON.parse(chunk.slice(6)) as E);
    }
  }
}
