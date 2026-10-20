// LESSON 10 SETTINGS: Context management
// Plain data, safe for the browser. The demos themselves are in lesson-10-server.ts (server only).

export const LESSON_10_MODELS = ["claude-opus-5", "claude-opus-5-5", "claude-sonnet-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
export const LESSON_10_MODEL = "claude-opus-5";

export type PatternId = "jit" | "compaction" | "caching" | "memory";

export const PATTERNS: Record<PatternId, { label: string; fixes: string; kind: string }> = {
  jit: { label: "1. Just-in-time context", fixes: "Window size and cost: only load what this turn needs", kind: "Design pattern" },
  compaction: { label: "2. Server-side compaction", fixes: "Window size: long conversations get summarized", kind: "API feature (beta)" },
  caching: { label: "3. Prompt caching", fixes: "Cost and latency: reuse the stable prefix", kind: "API feature" },
  memory: { label: "4. Memory tool", fixes: "Statelessness: notes survive across sessions", kind: "API feature (client tool)" },
};

// --- Pattern 1 + 3 share the fictional Demo Building Code (~25k tokens) -----------------------
export const CODE_QUESTIONS = [
  "What are the maximum stair riser height and minimum tread depth? Cite the section.",
  "When does a deck need a guard, and how tall must it be? Cite the section.",
  "Where are smoke alarms required, and do they need to be interconnected? Cite the section.",
];

// --- Pattern 2: compaction ---------------------------------------------------------------------
export const COMPACTION_MODELS = ["claude-haiku-5-5", "claude-opus-5"];
export const COMPACTION_TRIGGER = 50_000; // the API's minimum; the default is 150,000
export const COMPACTION_QUESTIONS = {
  first: "Based on the whole log so far, what are the three biggest open risks?",
  followUp: "Two facts I need exactly: which database did we choose for the orders service, and what is the launch date now?",
};

// --- Pattern 4: memory -------------------------------------------------------------------------
export const MEMORY_SESSIONS = [
  {
    label: "Session 1: tell it something",
    prompt:
      "Please remember for future sessions: I'm preparing for the Claude Platform 101 course, I prefer answers in at " +
      "most 3 bullet points, and I use TypeScript, not Python.",
  },
  {
    label: "Session 2: a brand-new conversation",
    prompt: "Show me how to make my first Claude API call.",
  },
  {
    label: "Session 3: update a preference",
    prompt: "Update my preferences: I'm fine with up to 5 bullet points now.",
  },
];

export const SNIPPETS = {
  compaction: `const response = await client.beta.messages.create({
  betas: ["compact-2026-01-12"],
  model: "claude-opus-5",
  max_tokens: 1024,
  context_management: {
    edits: [{ type: "compact_20260112", trigger: { type: "input_tokens", value: 50000 } }],
  },
  messages,
});
// Keep response.content (including the compaction block) in your history.`,
  caching: `const response = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 1024,
  system: [{
    type: "text",
    text: SYSTEM_PROMPT_WITH_CODE_BOOK,          // stable: identical on every call
    cache_control: { type: "ephemeral" },        // cache everything up to here
  }],
  messages: [{ role: "user", content: question }], // changes every call: after the breakpoint
});
// usage.cache_creation_input_tokens: written to cache (1.25x price)
// usage.cache_read_input_tokens:     read from cache (0.1x price)`,
  memory: `import { betaMemoryTool } from "@anthropic-ai/sdk/helpers/beta/memory";

const memory = betaMemoryTool({ view, create, str_replace, insert, delete: del, rename }); // YOUR storage

const finalMessage = await client.beta.messages.toolRunner({
  model: "claude-opus-5",
  max_tokens: 2048,
  tools: [memory],                 // { type: "memory_20250818", name: "memory" }
  messages: [{ role: "user", content: prompt }],
});`,
  jit: `// Upfront: the whole book in the system prompt, every call
system: "Answer from this building code:\\n" + entireCodeBook

// Just in time: a small system prompt + tools to pull in only what's needed
tools: [search_building_code, lookup_building_code]`,
};
