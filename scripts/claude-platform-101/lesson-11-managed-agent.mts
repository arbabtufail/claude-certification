// Lesson 11 script: one Kanban ticket, start to finish, in the terminal. Run: npm run lesson11
// Reuses the environment + agent stored in .managed-agents.json (create them on the lesson page, or here once).
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";

const client = new Anthropic();
const STATE = ".managed-agents.json";

// ONCE: environment + agent (skipped when the IDs are already stored)
let state = await readFile(STATE, "utf8").then(JSON.parse).catch(() => null);
if (!state) {
  const env = await client.beta.environments.create({
    name: "claude-course-kanban-env",
    config: { type: "cloud", networking: { type: "limited", allow_package_managers: true, allow_mcp_servers: false } },
  });
  const agent = await client.beta.agents.create({
    name: "Kanban Worker",
    model: "claude-opus-5-5",
    system: "You are a careful software engineer. Write every deliverable to /mnt/session/outputs/ and verify the rubric before finishing.",
    tools: [{ type: "agent_toolset_20260401", default_config: { enabled: true, permission_policy: { type: "auto" } },
      configs: [{ name: "web_fetch", enabled: false }, { name: "web_search", enabled: false }] }],
  });
  state = { environmentId: env.id, agentId: agent.id, agentVersion: agent.version, model: "claude-opus-5-5" };
  await writeFile(STATE, JSON.stringify(state, null, 2));
  console.log("Created environment + agent:", state);
}

// EVERY TICKET: a session with a budget, kicked off by an outcome
const session = await client.beta.sessions.create({
  agent: { type: "agent", id: state.agentId, version: state.agentVersion },
  environment_id: state.environmentId,
  title: "Kanban (script): primes.csv",
  budget: { type: "limit", max_list_cost: { amount: "150", currency: "USD" } },
});
console.log(`Session ${session.id}\nTrace: https://platform.claude.com/workspaces/default/sessions/${session.id}\n`);

// Stream first, then send the outcome
const stream = await client.beta.sessions.events.stream(session.id);
await client.beta.sessions.events.send(session.id, {
  events: [{
    type: "user.define_outcome",
    description: "Write a Python script that computes the first 100 primes and saves them as /mnt/session/outputs/primes.csv (also save the script as primes.py there).",
    rubric: { type: "text", content: "- primes.csv first line is n,prime\n- exactly 100 data rows, n from 1 to 100\n- row n=100 is 100,541\n- primes.py exists and recreates the same file" },
    max_iterations: 3,
  }],
});

for await (const e of stream) {
  if (e.type === "agent.tool_use") console.log(`[tool] ${e.name} ${JSON.stringify(e.input).slice(0, 120)}`);
  if (e.type === "agent.message") for (const b of e.content) if (b.type === "text") console.log(`[agent] ${b.text}`);
  if (e.type === "span.outcome_evaluation_end") console.log(`[grader] iteration ${e.iteration + 1}: ${e.result}`);
  if (e.type === "agent.tool_use" && e.evaluated_permission === "ask") {
    // Unattended script: deny anything the server wanted a human to approve
    await client.beta.sessions.events.send(session.id, { events: [{ type: "user.tool_confirmation", tool_use_id: e.id, result: "deny", deny_message: "No human available." }] });
  }
  if (e.type === "session.status_terminated") break;
  if (e.type === "session.status_idle" && e.stop_reason.type !== "requires_action") break;
}

await new Promise((r) => setTimeout(r, 3000)); // outputs are indexed a moment after idle
const files = await client.beta.files.list({ scope_id: session.id, betas: ["managed-agents-2026-04-01"] });
console.log("\nDeliverables:", files.data.map((f) => `${f.filename} (${f.size_bytes} B)`).join(", ") || "none");
const s = await client.beta.sessions.retrieve(session.id);
console.log("Usage:", JSON.stringify(s.usage));
