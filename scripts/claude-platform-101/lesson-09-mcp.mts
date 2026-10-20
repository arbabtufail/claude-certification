// Lesson 9 script: point Claude at an MCP server and let it discover the tools. Run: npm run lesson9
// Uses the lesson's Linear server when LINEAR_MCP_TOKEN is set in .env.local, otherwise the free DeepWiki server.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const server = process.env.LINEAR_MCP_TOKEN
  ? { type: "url" as const, url: "https://mcp.linear.app/mcp", name: "linear", authorization_token: process.env.LINEAR_MCP_TOKEN }
  : { type: "url" as const, url: "https://mcp.deepwiki.com/mcp", name: "deepwiki" };
console.log(`MCP server: ${server.name} (${server.url})\n`);

function print(response: Anthropic.Beta.Messages.BetaMessage) {
  console.log(`stop_reason: ${response.stop_reason} · tokens in/out: ${response.usage.input_tokens}/${response.usage.output_tokens}`);
  for (const block of response.content) {
    if (block.type === "mcp_tool_use") console.log(`[mcp_tool_use] ${block.server_name}.${block.name}(${JSON.stringify(block.input)})`);
    if (block.type === "mcp_tool_result") console.log(`[mcp_tool_result] ${JSON.stringify(block.content).slice(0, 160)}…`);
    if (block.type === "text") process.stdout.write(block.text);
  }
  console.log("\n");
}

// 1. The lesson's call: all tools, Claude discovers them
console.log("===== 1. What tools do you have available?");
print(
  await client.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: "What tools do you have available?" }],
    mcp_servers: [server],
    tools: [{ type: "mcp_toolset", mcp_server_name: server.name }],
    betas: ["mcp-client-2025-11-20"],
  }),
);

// 2. Filtering: disable everything, enable one read-only tool
const onlyTool = server.name === "linear" ? "list_issues" : "read_wiki_structure";
console.log(`===== 2. Same question, but only "${onlyTool}" is enabled`);
print(
  await client.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: "What tools do you have available?" }],
    mcp_servers: [server],
    tools: [
      {
        type: "mcp_toolset",
        mcp_server_name: server.name,
        default_config: { enabled: false },
        configs: { [onlyTool]: { enabled: true } },
      },
    ],
    betas: ["mcp-client-2025-11-20"],
  }),
);
