// LESSON 11 SETTINGS: What are managed agents?
// A small version of the lesson's Example 1: a Kanban board where moving a ticket to "In progress"
// starts a managed-agent session that works until a grader says the rubric is met.
// Plain data, safe for the browser.

export const AGENT_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-opus-5"];

export const AGENT_DEFINITION = {
  name: "Kanban Worker",
  model: "claude-opus-5-5",
  system:
    "You are a careful software engineer working through tickets from a Kanban board. Work inside your sandbox with " +
    "bash and the file tools. Write every deliverable to /mnt/session/outputs/. Before you finish, verify each rubric " +
    "criterion yourself by running commands (for example, count rows or measure file size), then give a short summary.",
};

export const SESSION_BUDGET_CENTS = 150; // hard cap per session: $1.50 at list prices
export const MAX_ITERATIONS = 3; // grader rounds before giving up (API default 3, max 20)

export type Ticket = { id: string; title: string; description: string; rubric: string };

// Each rubric = explicit, independently checkable criteria (what "done" looks like).
export const TICKETS: Ticket[] = [
  {
    id: "primes",
    title: "Generate primes.csv",
    description:
      "Write a Python script that computes the first 100 prime numbers and saves them as /mnt/session/outputs/primes.csv. " +
      "Save the script too, as /mnt/session/outputs/primes.py.",
    rubric: `# Rubric: primes.csv
- /mnt/session/outputs/primes.csv exists
- Its first line is exactly: n,prime
- It has exactly 100 data rows, with n running from 1 to 100
- Row n=1 is "1,2" and row n=100 is "100,541"
- /mnt/session/outputs/primes.py exists and running it recreates an identical primes.csv`,
  },
  {
    id: "landing",
    title: "Fast landing page",
    description:
      "Build a fast, single-file landing page for a coffee shop called 'Bean There' and save it as " +
      "/mnt/session/outputs/index.html.",
    rubric: `# Rubric: fast landing page (a small "Lighthouse" check)
- Exactly one file: /mnt/session/outputs/index.html, smaller than 12 KB
- All CSS is inline in a single <style> tag; no external stylesheets, scripts or web fonts
- No <script> tags in <head> (nothing render-blocking)
- Has <meta name="viewport"> and <meta name="description">
- Exactly one <h1>, plus sections for the menu, opening hours, and location
- Every <img> has loading="lazy", width, height and alt; images are inline SVG or data URIs, never external URLs`,
  },
  {
    id: "sales",
    title: "Sales report with chart",
    description:
      "Create a synthetic dataset of 12 months of sales for 3 products (use random seed 7), save it as " +
      "/mnt/session/outputs/sales.csv, then analyse it in /mnt/session/outputs/report.md with a chart.",
    rubric: `# Rubric: sales report
- /mnt/session/outputs/sales.csv has the columns month,product,units,revenue and exactly 36 data rows
- /mnt/session/outputs/report.md has a table of total revenue per month with 12 rows
- Every monthly total in report.md equals the sum of that month's rows in sales.csv
- report.md names the best month, the worst month, and the top product by revenue
- /mnt/session/outputs/chart.png exists (bar chart of monthly revenue) and report.md links to it`,
  },
];

export function ticketById(id: unknown): Ticket | undefined {
  return TICKETS.find((t) => t.id === id);
}

export const BUILDING_BLOCKS = [
  { name: "Agents", what: "Persisted, versioned config: model, persona, tools", here: "Created once by Setup, ID stored in .managed-agents.json" },
  { name: "Environments", what: "Sandbox template: packages, network rules", here: "Cloud container, limited networking, package managers allowed" },
  { name: "Sessions", what: "One run, in its own container, fired from your app", here: "One per ticket; several can run in parallel" },
  { name: "Tools", what: "Built-in bash/file tools, plus your custom tools", here: "agent_toolset_20260401 (web tools off)" },
  { name: "Permissions", what: "Sensitive actions wait for a human", here: "auto policy: uncertain calls pause for your Allow / Deny" },
  { name: "Outcomes", what: "Rubric + separate grader; Claude iterates until done", here: "Each ticket's rubric, up to 3 grader rounds" },
  { name: "Memory, MCP, multi-agent", what: "Stores, third-party services, coordinators", here: "Not used here (memory and MCP were lessons 9-10)" },
];

export const SNIPPET = `// ONCE (setup): environment + agent, store the IDs
const env = await client.beta.environments.create({ name, config: { type: "cloud", networking: { type: "limited" } } });
const agent = await client.beta.agents.create({ name, model, system, tools: [{ type: "agent_toolset_20260401" }] });

// EVERY TICKET: a session pinned to the agent version, kicked off with an outcome
const session = await client.beta.sessions.create({
  agent: { type: "agent", id: agent.id, version: agent.version },
  environment_id: env.id,
  budget: { type: "limit", max_list_cost: { amount: "150", currency: "USD" } }, // $1.50 cap
});
await client.beta.sessions.events.send(session.id, {
  events: [{ type: "user.define_outcome", description, rubric: { type: "text", content: rubric } }],
});

// Watch it work: tool calls, grader verdicts, idle when done
for await (const event of await client.beta.sessions.events.stream(session.id)) { ... }`;
