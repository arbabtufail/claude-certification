// SERVER TOOLS (server only)
// Lesson 7: web search, web fetch and code execution run on Anthropic's servers. You declare them in `tools`
// and the results come back inside the SAME response: no agent loop, no tool_result messages from you.
//
// The one exception is stop_reason "pause_turn": the server-side loop hit its iteration limit. You resume it
// by sending the conversation back as-is (no extra "continue" message). That's the only loop here.
import type Anthropic from "@anthropic-ai/sdk";
import { client } from "./client";
import { estimateCostUsd } from "./models";

export const WEB_SEARCH_USD_PER_SEARCH = 10 / 1000; // $10 per 1,000 searches, on top of tokens
const MAX_CONTINUATIONS = 3;

export type ServerToolsInput = {
  model: string;
  maxTokens: number;
  tools: Anthropic.ToolUnion[];
  prompt: string;
  container?: Anthropic.ContainerParams; // lesson 8: { skills: [...] } loads Skills into the code execution container
  signal?: AbortSignal;
};

export type ServerToolsResult = {
  model: string;
  blocks: Anthropic.ContentBlock[]; // every block from every response, in order
  stopReason: Anthropic.Message["stop_reason"];
  apiCalls: number; // 1, plus one per pause_turn resume
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
  webFetches: number;
  tokenCostUsd: number;
  searchCostUsd: number;
  costUsd: number;
  ms: number;
};

export async function callWithServerTools({ model, maxTokens, tools, prompt, container: containerParams, signal }: ServerToolsInput): Promise<ServerToolsResult> {
  const started = performance.now();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  const blocks: Anthropic.ContentBlock[] = [];
  let containerId: string | undefined;
  const totals = { apiCalls: 0, inputTokens: 0, outputTokens: 0, webSearches: 0, webFetches: 0 };
  let response: Anthropic.Message;

  while (true) {
    response = await client.messages.create(
      { model, max_tokens: maxTokens, tools, messages, ...containerFor(containerParams, containerId) },
      { signal },
    );
    totals.apiCalls++;
    totals.inputTokens += response.usage.input_tokens;
    totals.outputTokens += response.usage.output_tokens;
    totals.webSearches += response.usage.server_tool_use?.web_search_requests ?? 0;
    totals.webFetches += response.usage.server_tool_use?.web_fetch_requests ?? 0;
    blocks.push(...response.content);

    if (response.stop_reason !== "pause_turn" || totals.apiCalls > MAX_CONTINUATIONS) break;

    // Resume: send Claude's partial turn back unchanged. Code execution must keep the same container.
    messages.push({ role: "assistant", content: response.content });
    containerId = response.container?.id ?? containerId;
  }

  const tokenCostUsd = estimateCostUsd(model, totals.inputTokens, totals.outputTokens);
  const searchCostUsd = totals.webSearches * WEB_SEARCH_USD_PER_SEARCH;
  return {
    model,
    blocks,
    stopReason: response.stop_reason,
    ...totals,
    tokenCostUsd,
    searchCostUsd,
    costUsd: tokenCostUsd + searchCostUsd,
    ms: Math.round(performance.now() - started),
  };
}

// First request: the caller's container settings (e.g. skills). After a pause_turn: the same container by id.
function containerFor(params: Anthropic.ContainerParams | undefined, id: string | undefined) {
  if (params) return { container: { ...params, ...(id ? { id } : {}) } };
  return id ? { container: id } : {};
}
