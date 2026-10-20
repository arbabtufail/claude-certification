"use client";
// React hook: start an agent run, collect its streamed events, and allow stopping it.
import { useRef, useState } from "react";
import type { AgentEvent } from "@/lib/claude/agent-loop";
import { streamAgent } from "./stream-agent";

export function useAgentRun() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Resolves with every event of the run once it ends, so callers can keep a history of runs.
  async function start(url: string, body: unknown): Promise<AgentEvent[]> {
    setRunning(true);
    setEvents([]);
    setError(null);
    const abort = new AbortController();
    abortRef.current = abort;
    const collected: AgentEvent[] = [];

    try {
      await streamAgent(url, body, abort.signal, (event) => {
        if (event.type === "error") return setError(event.error);
        collected.push(event);
        setEvents((cur) => [...cur, event]);
      });
    } catch (err) {
      if (!abort.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
    return collected;
  }

  const stop = () => abortRef.current?.abort();

  return { events, running, error, start, stop };
}
