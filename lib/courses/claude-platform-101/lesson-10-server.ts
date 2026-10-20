// LESSON 10 (server only): the demos for patterns 1-3. Pattern 4 (memory) uses lib/claude/memory-store.ts.
import type Anthropic from "@anthropic-ai/sdk";
import { client } from "@/lib/claude/client";
import { sendMessage } from "@/lib/claude/send";
import { runAgentLoop, type AgentEvent, type ToolRunner } from "@/lib/claude/agent-loop";
import { estimateCostUsd, estimateCostWithCache } from "@/lib/claude/models";
import { codeBookText, lookupCode, searchCode } from "./lesson-10-codebook";
import { COMPACTION_QUESTIONS, COMPACTION_TRIGGER } from "./lesson-10";

const textOf = (content: { type: string }[]) =>
  content.filter((b) => b.type === "text").map((b) => (b as unknown as { text: string }).text).join("\n");

// =============================================================================================
// Pattern 1: just-in-time context. Same question, two designs.
// =============================================================================================
const UPFRONT_SYSTEM = "You are a building code assistant. Answer briefly from the building code below and cite section ids.\n\n";
const JIT_SYSTEM =
  "You are a building code assistant. You do not have the code book in front of you: use search_building_code to " +
  "find relevant sections, then lookup_building_code to read only the ones you need. Answer briefly and cite section ids.";

const JIT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_building_code",
    description: "Search the building code by keywords. Returns up to 5 matching section ids and titles, not their text.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "Keywords, e.g. 'stair riser'" } }, required: ["query"] },
  },
  {
    name: "lookup_building_code",
    description: "Look up one building code section by its id (e.g. 'DBC 5.3'). Returns the full text of that section.",
    input_schema: { type: "object", properties: { section: { type: "string", description: "Section id like 'DBC 5.3'" } }, required: ["section"] },
  },
];

const runJitTool: ToolRunner = (name, input) => {
  if (name === "search_building_code") return searchCode(String(input.query ?? ""));
  if (name === "lookup_building_code") return lookupCode(String(input.section ?? ""));
  throw new Error(`Unknown tool: ${name}`);
};

export async function compareJustInTime(question: string, model: string) {
  const jitEvents: AgentEvent[] = [];
  const [upfront] = await Promise.all([
    sendMessage({ model, maxTokens: 1024, system: UPFRONT_SYSTEM + codeBookText(), prompt: question }),
    runAgentLoop({
      model, maxTokens: 1024, system: JIT_SYSTEM, tools: JIT_TOOLS, runTool: runJitTool, prompt: question, maxTurns: 8,
      onEvent: (e) => jitEvents.push(e),
    }),
  ]);
  const done = jitEvents.find((e) => e.type === "done");
  return {
    upfront: { text: upfront.text, inputTokens: upfront.inputTokens, outputTokens: upfront.outputTokens, costUsd: upfront.costUsd, ms: upfront.ms, apiCalls: 1 },
    jit: {
      text: done?.type === "done" ? done.finalText : "",
      inputTokens: done?.type === "done" ? done.totals.inputTokens : 0,
      outputTokens: done?.type === "done" ? done.totals.outputTokens : 0,
      costUsd: done?.type === "done" ? done.totals.costUsd : 0,
      ms: done?.type === "done" ? done.totals.ms : 0,
      apiCalls: done?.type === "done" ? done.totals.apiCalls : 0,
      calls: jitEvents.flatMap((e) => (e.type === "tool_result" ? [`${e.call.name}(${JSON.stringify(e.call.input)})`] : [])),
      perCallInput: jitEvents.flatMap((e) => (e.type === "response" ? [e.inputTokens] : [])),
    },
  };
}

// =============================================================================================
// Pattern 3: prompt caching. Several questions in a row against the same big system prompt.
// =============================================================================================
export async function runCaching(model: string, questions: string[], useCache: boolean) {
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: UPFRONT_SYSTEM + codeBookText(), ...(useCache ? { cache_control: { type: "ephemeral" as const } } : {}) },
  ];
  const calls = [];
  // Sequential on purpose: the first call writes the cache, the next ones read it.
  for (const question of questions) {
    const t0 = performance.now();
    const r = await client.messages.create({ model, max_tokens: 512, system, messages: [{ role: "user", content: question }] });
    const usage = {
      inputTokens: r.usage.input_tokens,
      cacheWriteTokens: r.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: r.usage.cache_read_input_tokens ?? 0,
      outputTokens: r.usage.output_tokens,
    };
    const totalIn = usage.inputTokens + usage.cacheWriteTokens + usage.cacheReadTokens;
    calls.push({
      question,
      ...usage,
      costUsd: estimateCostWithCache(model, usage),
      costIfUncachedUsd: estimateCostUsd(model, totalIn, usage.outputTokens),
      ms: Math.round(performance.now() - t0),
      answer: textOf(r.content),
    });
  }
  return { calls };
}

// =============================================================================================
// Pattern 2: server-side compaction. A ~60k-token conversation crosses the trigger.
// =============================================================================================
const NAMES = ["Priya", "Tom", "Lena", "Marco", "Aisha", "Ken"];
const WORK = [
  "reviewed the checkout funnel metrics and opened follow-up tickets for the two biggest drop-off steps",
  "paired with QA on regression tests for the address form, fixing three flaky selectors along the way",
  "updated the runbook for the payments service with the new on-call escalation path and dashboards",
  "met the design team about the order history page; agreed to ship the simple table first, filters later",
  "investigated slow queries on the reporting endpoint and added two missing indexes in staging",
  "wrote the migration plan for moving old invoices to cold storage, pending a review from finance",
  "triaged 14 support tickets; most were password resets, two were real bugs in the coupon flow",
  "prototyped the notification preferences screen and shared a short video with the product channel",
];

// Facts hidden in the long log, so you can check what survives the summary.
const NEEDLES: Record<number, string> = {
  12: "DECISION: we chose PostgreSQL 16 for the orders service instead of MongoDB. Owner: Priya.",
  71: "UPDATE: the launch date moved from November 3 to November 20 because of the payments audit.",
  133: "NEW RISK: the SMS vendor contract ends December 31 and no replacement has been chosen yet.",
};

function projectLogChunks(): string[] {
  const days: string[] = [];
  for (let d = 1; d <= 300; d++) {
    const lines = NAMES.map((n, i) => `- ${n} ${WORK[(d * 3 + i * 5) % WORK.length]} (day ${d}, item ${i + 1}).`);
    if (NEEDLES[d]) lines.splice(2, 0, `- ${NEEDLES[d]}`);
    days.push(`### Day ${d}\n${lines.join("\n")}`);
  }
  const chunks: string[] = [];
  for (let i = 0; i < days.length; i += 50) chunks.push(days.slice(i, i + 50).join("\n\n"));
  return chunks;
}

function longHistory(): Anthropic.Beta.Messages.BetaMessageParam[] {
  return projectLogChunks().flatMap((chunk, i) => [
    { role: "user" as const, content: `Here is part ${i + 1} of our project log. Just read it for now.\n\n${chunk}` },
    { role: "assistant" as const, content: `Read part ${i + 1}.` },
  ]);
}

const contextManagement: Anthropic.Beta.Messages.BetaContextManagementConfig = {
  edits: [{ type: "compact_20260112", trigger: { type: "input_tokens", value: COMPACTION_TRIGGER } }],
};

async function compactCall(model: string, messages: Anthropic.Beta.Messages.BetaMessageParam[]) {
  const t0 = performance.now();
  const r = await client.beta.messages.create({
    betas: ["compact-2026-01-12"],
    model,
    max_tokens: 2048,
    context_management: contextManagement,
    messages,
  });
  // Compaction itself is a model call; the usage "iterations" list shows it separately when present.
  const iterations = ((r.usage as { iterations?: { input_tokens?: number; output_tokens?: number; type?: string }[] }).iterations ?? []);
  const billedIn = iterations.length ? iterations.reduce((n, it) => n + (it.input_tokens ?? 0), 0) : r.usage.input_tokens;
  const billedOut = iterations.length ? iterations.reduce((n, it) => n + (it.output_tokens ?? 0), 0) : r.usage.output_tokens;
  const compaction = r.content.find((b) => b.type === "compaction") as { content?: string | null } | undefined;
  return {
    response: r,
    summary: {
      sentMessages: messages.length,
      inputTokens: r.usage.input_tokens,
      outputTokens: r.usage.output_tokens,
      iterations,
      compacted: Boolean(compaction),
      compactionSummary: compaction?.content ?? null,
      blockTypes: r.content.map((b) => b.type),
      answer: textOf(r.content),
      costUsd: estimateCostUsd(model, billedIn, billedOut),
      ms: Math.round(performance.now() - t0),
    },
  };
}

export async function runCompaction(model: string) {
  const history = longHistory();
  const first: Anthropic.Beta.Messages.BetaMessageParam[] = [...history, { role: "user", content: COMPACTION_QUESTIONS.first }];
  const call1 = await compactCall(model, first);

  // Keep the FULL response content (with the compaction block) in the history, then ask a follow-up.
  // The server sees the compaction block and drops everything before it.
  const second: Anthropic.Beta.Messages.BetaMessageParam[] = [
    ...first,
    { role: "assistant", content: call1.response.content },
    { role: "user", content: COMPACTION_QUESTIONS.followUp },
  ];
  const call2 = await compactCall(model, second);

  return {
    trigger: COMPACTION_TRIGGER,
    first: call1.summary,
    followUp: call2.summary,
  };
}
