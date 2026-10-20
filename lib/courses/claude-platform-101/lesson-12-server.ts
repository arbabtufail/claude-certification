// LESSON 12 (server only): the smallest managed agent, step by step.
// Agent and environment are created once and their IDs kept in .managed-agents-lesson12.json (git-ignored).
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { client } from "@/lib/claude/client";
import { isFinishedIdle, trimEvent } from "@/lib/claude/managed-agents";
import { LINE_COUNTER, type Networking } from "./lesson-12";

const STATE_FILE = path.join(process.cwd(), ".managed-agents-lesson12.json");

export type Lesson12State = {
  agent?: { id: string; version: number; model: string };
  environment?: { id: string; networking: Networking };
};

export async function getState(): Promise<Lesson12State> {
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

const saveState = (s: Lesson12State) => writeFile(STATE_FILE, JSON.stringify(s, null, 2), "utf8");

// Step 1: the agent (persona: model, system prompt, toolset). Reusable across many sessions.
export async function createAgent(model: string) {
  const state = await getState();
  const agent = await client.beta.agents.create({
    name: LINE_COUNTER.name,
    model,
    system: LINE_COUNTER.system,
    tools: [{ type: "agent_toolset_20260401", default_config: { enabled: true } }], // the bundled file/bash/web tools
  });
  state.agent = { id: agent.id, version: agent.version, model };
  await saveState(state);
  return state;
}

// Step 2: the environment (where it runs): a cloud container template.
export async function createEnvironment(networking: Networking) {
  const state = await getState();
  const environment = await client.beta.environments.create({
    name: "line-counter-env",
    config: {
      type: "cloud",
      networking: networking === "unrestricted" ? { type: "unrestricted" } : { type: "limited", allow_package_managers: true },
    },
  });
  state.environment = { id: environment.id, networking };
  await saveState(state);
  return state;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

// Steps 3-5: one session = one run. Open the stream BEFORE sending the kickoff, then read events until idle.
export async function runSession(prompt: string, title: string, signal: AbortSignal, send: (e: Loose) => void) {
  const state = await getState();
  if (!state.agent || !state.environment) throw new Error("Create the agent and the environment first (steps 1 and 2).");

  // Step 3
  const session = await client.beta.sessions.create({ agent: state.agent.id, environment_id: state.environment.id, title });
  send({ type: "relay.step", step: 3, sessionId: session.id });

  // Step 4: stream first...
  const stream = await client.beta.sessions.events.stream(session.id, undefined, { signal });
  send({ type: "relay.step", step: 4 });
  // ...then the kickoff. Note: events, plural.
  await client.beta.sessions.events.send(session.id, {
    events: [{ type: "user.message", content: [{ type: "text", text: prompt }] }],
  });

  // Step 5
  send({ type: "relay.step", step: 5 });
  for await (const raw of stream) {
    const e = raw as Loose;
    if (!e.id) continue; // live-preview deltas have no id; we only show complete events
    send(trimEvent(e));
    if (isFinishedIdle(e)) break; // idle for a reason other than "waiting on you" = done
  }

  // Final numbers for the page: status, tokens and list cost
  const s = (await client.beta.sessions.retrieve(session.id)) as unknown as Loose;
  send({ type: "relay.done", sessionId: session.id, status: s.status, usage: s.usage ?? null });
}
