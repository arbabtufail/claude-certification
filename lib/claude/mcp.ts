// MCP CONNECTOR (server only, beta)
// Lesson 9: point Claude at a remote MCP server. Anthropic connects to it, discovers its tools, and calls them.
// You write no tool schemas and no client for the service: the service provider maintains the MCP server.
import type Anthropic from "@anthropic-ai/sdk";
import { client } from "./client";
import { estimateCostUsd } from "./models";

export const MCP_BETA = "mcp-client-2025-11-20";
const MAX_CONTINUATIONS = 3;

export type McpServer = { name: string; url: string; token?: string };

export type McpTool = { name: string; description: string; params: string[] };

type BetaBlock = Anthropic.Beta.Messages.BetaContentBlock;

export type McpResult = {
  model: string;
  blocks: BetaBlock[];
  stopReason: string | null;
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  ms: number;
  request: unknown; // what we sent, with the token redacted, so the page can show it
};

// allowlist = null  -> every tool on the server (the default)
// allowlist = [...] -> default_config disables everything, configs re-enables only these tools
export function mcpToolset(serverName: string, allowlist: string[] | null): Anthropic.Beta.Messages.BetaMCPToolset {
  if (!allowlist) return { type: "mcp_toolset", mcp_server_name: serverName };
  return {
    type: "mcp_toolset",
    mcp_server_name: serverName,
    default_config: { enabled: false },
    configs: Object.fromEntries(allowlist.map((name) => [name, { enabled: true }])),
  };
}

export async function callWithMcp(input: {
  model: string;
  maxTokens: number;
  prompt: string;
  server: McpServer;
  allowlist: string[] | null;
  signal?: AbortSignal;
}): Promise<McpResult> {
  const { model, maxTokens, prompt, server, allowlist, signal } = input;
  const started = performance.now();

  const mcpServers: Anthropic.Beta.Messages.BetaRequestMCPServerURLDefinition[] = [
    { type: "url", url: server.url, name: server.name, ...(server.token ? { authorization_token: server.token } : {}) },
  ];
  const tools = [mcpToolset(server.name, allowlist)];
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [{ role: "user", content: prompt }];
  const blocks: BetaBlock[] = [];
  const totals = { apiCalls: 0, inputTokens: 0, outputTokens: 0 };
  let response: Anthropic.Beta.Messages.BetaMessage;

  while (true) {
    response = await client.beta.messages.create(
      { model, max_tokens: maxTokens, messages, mcp_servers: mcpServers, tools, betas: [MCP_BETA] },
      { signal },
    );
    totals.apiCalls++;
    totals.inputTokens += response.usage.input_tokens;
    totals.outputTokens += response.usage.output_tokens;
    blocks.push(...response.content);

    // MCP calls run server-side like other server tools, so a long turn can pause; resend to resume.
    if (response.stop_reason !== "pause_turn" || totals.apiCalls > MAX_CONTINUATIONS) break;
    messages.push({ role: "assistant", content: response.content });
  }

  return {
    model,
    blocks,
    stopReason: response.stop_reason,
    ...totals,
    costUsd: estimateCostUsd(model, totals.inputTokens, totals.outputTokens),
    ms: Math.round(performance.now() - started),
    request: {
      model,
      max_tokens: maxTokens,
      betas: [MCP_BETA],
      mcp_servers: mcpServers.map((s) => ({ ...s, ...(s.authorization_token ? { authorization_token: "•••• (redacted)" } : {}) })),
      tools,
      messages: [{ role: "user", content: prompt }],
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Discovery without Claude: the same tools/list call the connector makes, done directly over the
// MCP "streamable HTTP" transport (JSON-RPC 2.0). Costs no tokens.
// ---------------------------------------------------------------------------------------------
async function rpc(server: McpServer, body: object, session?: string) {
  const res = await fetch(server.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(server.token ? { Authorization: `Bearer ${server.token}` } : {}),
      ...(session ? { "Mcp-Session-Id": session } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok && res.status !== 202) throw new Error(`MCP server answered HTTP ${res.status}`);
  const text = await res.text();
  // Servers may answer with plain JSON or with a short server-sent-events stream.
  const payload = (res.headers.get("content-type") ?? "").includes("text/event-stream")
    ? text.split("\n").filter((l) => l.startsWith("data:")).pop()?.slice(5)
    : text;
  const json = payload ? JSON.parse(payload) : null;
  if (json?.error) throw new Error(`MCP error: ${json.error.message ?? JSON.stringify(json.error)}`);
  return { json, session: res.headers.get("mcp-session-id") ?? session };
}

export async function listMcpTools(server: McpServer): Promise<{ serverInfo: string; tools: McpTool[] }> {
  const init = await rpc(server, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "claude-course-preparations", version: "1.0" } },
  });
  await rpc(server, { jsonrpc: "2.0", method: "notifications/initialized" }, init.session ?? undefined);
  const list = await rpc(server, { jsonrpc: "2.0", id: 2, method: "tools/list" }, init.session ?? undefined);

  const info = init.json?.result?.serverInfo;
  const tools = (list.json?.result?.tools ?? []) as { name: string; description?: string; inputSchema?: { properties?: object } }[];
  return {
    serverInfo: info ? `${info.name}${info.version ? ` ${info.version}` : ""}` : server.url,
    tools: tools.map((t) => ({ name: t.name, description: t.description ?? "", params: Object.keys(t.inputSchema?.properties ?? {}) })),
  };
}
