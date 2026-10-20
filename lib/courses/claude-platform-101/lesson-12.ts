// LESSON 12 SETTINGS: Building your first managed agent
// Plain data, safe for the browser. The API calls are in lesson-12-server.ts (server only).

export const LINE_COUNTER = {
  name: "Line Counter",
  model: "claude-opus-5", // the lesson's model
  system: "You are a helpful agent that completes small file tasks.",
};
export const LESSON_12_MODELS = ["claude-opus-5", "claude-opus-5-5", "claude-sonnet-5-5"];

export type Networking = "limited" | "unrestricted";
export const NETWORKING: Record<Networking, { label: string; help: string }> = {
  limited: {
    label: "limited (recommended here)",
    help: "No general internet, package managers allowed. This task never needs the web.",
  },
  unrestricted: {
    label: "unrestricted (as in the lesson)",
    help: "The whole sandbox gets full internet access. Fine for a demo; keep secrets out of such a sandbox.",
  },
};

export const KICKOFFS = [
  { label: "Lesson task", text: "Create a file in the temp directory, count its lines, and report back." },
  {
    label: "Mini fileshare cleanup",
    text:
      "In /tmp/incoming create 12 small test files: 4 .pdf invoices, 3 .png screenshots, 2 duplicate copies of one " +
      "invoice, 2 zero-byte files and 1 file named 'notes' with no extension. Then organize them: invoices into " +
      "/tmp/projects/finance, screenshots into /tmp/projects/design, duplicates and zero-byte files into /tmp/archive, " +
      "and flag anything you can't confidently place. Report a table of every file and where it went.",
  },
];

// The lesson's five steps, shown on the page next to what actually happened.
export const STEPS = [
  { n: 1, title: "Create the agent", code: `const agent = await client.beta.agents.create({
  name: "Line Counter",
  model: "claude-opus-5",
  system: "You are a helpful agent that completes small file tasks.",
  tools: [{ type: "agent_toolset_20260401", default_config: { enabled: true } }],
});` },
  { n: 2, title: "Create the environment", code: `const environment = await client.beta.environments.create({
  name: "line-counter-env",
  config: { type: "cloud", networking: { type: "unrestricted" } },
});` },
  { n: 3, title: "Create the session", code: `const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: environment.id,
  title: "Count lines demo",
});` },
  { n: 4, title: "Open the stream, THEN send the kickoff", code: `const stream = await client.beta.sessions.events.stream(session.id); // open first
await client.beta.sessions.events.send(session.id, {
  events: [{ type: "user.message", content: [{ type: "text", text: "Create a file ..." }] }],
});` },
  { n: 5, title: "Consume the stream", code: `for await (const event of stream) {
  if (event.type === "agent.message") { /* print text blocks */ }
  else if (event.type === "agent.tool_use") console.log(\`[tool] \${event.name}\`);
  else if (event.type === "session.status_idle") break; // done
}` },
];
