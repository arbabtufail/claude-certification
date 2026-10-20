// MANAGED AGENTS (server only, beta)
// Lesson 11: Anthropic hosts the agent loop AND a sandbox container per session.
//   Agent        = persisted, versioned config (model, system prompt, tools). Create ONCE, reuse by ID.
//   Environment  = the sandbox template (cloud container, networking rules). Create ONCE.
//   Session      = one run of the agent in its own container. Create for EVERY task.
//   Events       = what you send in (user.define_outcome, user.tool_confirmation...) and stream out.
// The SDK adds the managed-agents beta header on every client.beta.{agents,environments,sessions} call.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { client } from "./client";

// "Create once, store the ID": this app keeps the IDs in a local, git-ignored file.
const STATE_FILE = path.join(process.cwd(), ".managed-agents.json");

export type SetupState = { environmentId: string; agentId: string; agentVersion: number; model: string };

export type AgentDefinition = { name: string; model: string; system: string };

async function readState(): Promise<SetupState | null> {
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

const writeState = (s: SetupState) => writeFile(STATE_FILE, JSON.stringify(s, null, 2), "utf8");

// Bash, file read/write/edit, glob and grep run in the container. The web tools stay off: these tickets
// don't need the internet. "auto" lets the server approve safe calls and pause on uncertain ones for you.
const TOOLS = [
  {
    type: "agent_toolset_20260401" as const,
    default_config: { enabled: true, permission_policy: { type: "auto" as const } },
    configs: [
      { name: "web_fetch" as const, enabled: false },
      { name: "web_search" as const, enabled: false },
    ],
  },
];

export async function getSetup(): Promise<SetupState | null> {
  return readState();
}

// Step 1 (once): an environment and an agent. Running it again reuses what's already stored.
export async function ensureSetup(def: AgentDefinition): Promise<SetupState> {
  const existing = await readState();
  if (existing) return existing;

  const environment = await client.beta.environments.create({
    name: "claude-course-kanban-env",
    config: { type: "cloud", networking: { type: "limited", allow_package_managers: true, allow_mcp_servers: false } },
  });
  const agent = await client.beta.agents.create({ name: def.name, model: def.model, system: def.system, tools: TOOLS });

  const state = { environmentId: environment.id, agentId: agent.id, agentVersion: agent.version, model: def.model };
  await writeState(state);
  return state;
}

// Changing an agent = UPDATE it (new immutable version), never create a new one.
// Running sessions keep the version they started with; new sessions get the new one.
export async function updateAgentModel(model: string): Promise<SetupState> {
  const state = await readState();
  if (!state) throw new Error("Run the setup first");
  const agent = await client.beta.agents.update(state.agentId, { version: state.agentVersion, model });
  const next = { ...state, agentVersion: agent.version, model };
  await writeState(next);
  return next;
}

// Step 2 (every task): a session pinned to the agent version, with a hard spend cap,
// kicked off with an OUTCOME: a description + a rubric that a separate grader checks.
export async function startOutcomeSession(input: {
  title: string;
  description: string;
  rubric: string;
  maxIterations: number;
  budgetCents: number;
}): Promise<string> {
  const state = await readState();
  if (!state) throw new Error("Run the setup first");

  const session = await client.beta.sessions.create({
    agent: { type: "agent", id: state.agentId, version: state.agentVersion },
    environment_id: state.environmentId,
    title: input.title,
    budget: { type: "limit", max_list_cost: { amount: String(input.budgetCents), currency: "USD" } },
  });

  // The outcome IS the kickoff: no separate user.message.
  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: "user.define_outcome",
        description: input.description,
        rubric: { type: "text", content: input.rubric },
        max_iterations: input.maxIterations,
      },
    ],
  });
  return session.id;
}

// ---------------------------------------------------------------------------------------------
// Streaming. The SSE stream has no replay, so every (re)connect: open the stream, fetch history,
// emit history, then emit live events, skipping ids already seen.
// ---------------------------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

const KICKOFF = new Set(["user.define_outcome", "user.message"]);

// Done = terminated, or idle for a reason other than "waiting on you" (requires_action)...
export function isFinishedIdle(e: Loose) {
  return e.type === "session.status_terminated" || (e.type === "session.status_idle" && e.stop_reason?.type !== "requires_action");
}

export async function streamSessionEvents(sessionId: string, signal: AbortSignal, send: (e: Loose) => void) {
  const stream = await client.beta.sessions.events.stream(sessionId, undefined, { signal });

  const seen = new Set<string>();
  const history: Loose[] = [];
  for await (const e of client.beta.sessions.events.list(sessionId, undefined, { signal })) history.push(e as Loose);

  let lastKickoff = -1;
  let finishedAt = -1;
  history.forEach((e, i) => {
    seen.add(e.id);
    if (KICKOFF.has(e.type)) lastKickoff = i;
    if (isFinishedIdle(e)) finishedAt = i;
    send(trimEvent(e));
  });
  // ...but only an idle that came AFTER the latest kickoff means this task is finished.
  if (finishedAt > lastKickoff && lastKickoff >= 0) return;

  for await (const raw of stream) {
    const e = raw as Loose;
    if (!e.id || seen.has(e.id)) continue;
    seen.add(e.id);
    send(trimEvent(e));
    if (isFinishedIdle(e)) return;
  }
}

// Keep each event small for the browser: drop bulky fields, shorten long text.
export function trimEvent(e: Loose): Loose {
  const cut = (s: unknown, n = 1500) => (typeof s === "string" && s.length > n ? `${s.slice(0, n)}… (${s.length} chars)` : s);
  const texts = (content: unknown) =>
    Array.isArray(content) ? content.map((b: Loose) => (b.type === "text" ? b.text : `[${b.type}]`)).join("\n") : content;
  return {
    id: e.id,
    type: e.type,
    processed_at: e.processed_at,
    ...(e.content !== undefined ? { text: cut(texts(e.content)) } : {}),
    ...(e.name ? { name: e.name } : {}),
    ...(e.input !== undefined ? { input: cut(JSON.stringify(e.input), 400) } : {}),
    ...(e.is_error !== undefined ? { is_error: e.is_error } : {}),
    ...(e.evaluated_permission ? { evaluated_permission: e.evaluated_permission } : {}),
    ...(e.stop_reason ? { stop_reason: e.stop_reason.type } : {}),
    ...(e.result ? { result: e.result } : {}),
    ...(e.explanation ? { explanation: cut(e.explanation, 1200) } : {}),
    ...(e.iteration !== undefined ? { iteration: e.iteration } : {}),
    ...(e.description ? { description: cut(e.description, 300) } : {}),
    ...(e.error ? { error: cut(e.error.message ?? JSON.stringify(e.error), 400) } : {}),
    ...(e.usage?.list_cost ? { list_cost: e.usage.list_cost } : {}),
  };
}

// Human in the loop: a call the server couldn't decide on waits for allow/deny (use the EVENT id).
export async function confirmTool(sessionId: string, eventId: string, allow: boolean) {
  await client.beta.sessions.events.send(sessionId, {
    events: [
      allow
        ? { type: "user.tool_confirmation", tool_use_id: eventId, result: "allow" }
        : { type: "user.tool_confirmation", tool_use_id: eventId, result: "deny", deny_message: "Denied from the Kanban board." },
    ],
  });
}

export async function interruptSession(sessionId: string) {
  await client.beta.sessions.events.send(sessionId, { events: [{ type: "user.interrupt" }] });
}

export async function sessionSummary(sessionId: string) {
  const s = (await client.beta.sessions.retrieve(sessionId)) as unknown as Loose;
  return { id: s.id, status: s.status, title: s.title, usage: s.usage ?? null, outcome_evaluations: s.outcome_evaluations ?? [] };
}

// Deliverables: files the agent wrote to /mnt/session/outputs/ (listing by scope needs the beta header).
export async function listOutputs(sessionId: string) {
  const files = await client.beta.files.list({ scope_id: sessionId, betas: ["managed-agents-2026-04-01"] });
  return files.data.map((f) => ({ id: f.id, filename: f.filename, size: f.size_bytes }));
}

export async function downloadOutput(fileId: string) {
  return client.beta.files.download(fileId);
}
