// Lesson 12 script: the smallest managed agent, step by step, as in the course. Run: npm run lesson12
// Steps 1-2 run once; their IDs are saved in .managed-agents-lesson12.json and reused (the page uses the same file).
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";

const client = new Anthropic();
const STATE = ".managed-agents-lesson12.json";
const state = await readFile(STATE, "utf8").then(JSON.parse).catch(() => ({}));

// Step 1: create the agent (once)
if (!state.agent) {
  const agent = await client.beta.agents.create({
    name: "Line Counter",
    model: "claude-opus-5",
    system: "You are a helpful agent that completes small file tasks.",
    tools: [{ type: "agent_toolset_20260401", default_config: { enabled: true } }],
  });
  state.agent = { id: agent.id, version: agent.version, model: "claude-opus-5" };
}
console.log("Agent:", state.agent.id);

// Step 2: create the environment (once). The lesson uses "unrestricted"; this task needs no internet,
// so we use "limited" (package managers allowed). Swap in { type: "unrestricted" } to match the video exactly.
if (!state.environment) {
  const environment = await client.beta.environments.create({
    name: "line-counter-env",
    config: { type: "cloud", networking: { type: "limited", allow_package_managers: true } },
  });
  state.environment = { id: environment.id, networking: "limited" };
}
console.log("Environment:", state.environment.id);
await writeFile(STATE, JSON.stringify(state, null, 2));

// Step 3: create the session (every run)
const session = await client.beta.sessions.create({
  agent: state.agent.id,
  environment_id: state.environment.id,
  title: "Count lines demo",
});
console.log("Session:", session.id, "\n");

// Step 4: open the stream FIRST, then send the kickoff (events, plural)
const stream = await client.beta.sessions.events.stream(session.id);
await client.beta.sessions.events.send(session.id, {
  events: [{
    type: "user.message",
    content: [{ type: "text", text: "Create a file in the temp directory, count its lines, and report back." }],
  }],
});

// Step 5: consume the stream
for await (const event of stream) {
  if (event.type === "agent.message") {
    for (const block of event.content) if (block.type === "text") process.stdout.write(block.text);
  } else if (event.type === "agent.tool_use") {
    console.log(`\n[tool] ${event.name}`);
  } else if (event.type === "session.status_idle") {
    if (event.stop_reason.type === "requires_action") continue; // waiting on us (e.g. an approval), not done
    console.log("\n--- Agent done ---");
    break;
  }
}

const s = await client.beta.sessions.retrieve(session.id);
console.log("Usage:", JSON.stringify(s.usage));
