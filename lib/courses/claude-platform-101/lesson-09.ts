// LESSON 9 SETTINGS: MCP
// Plain data, safe for the browser. Tokens never live here: see lesson-09-servers.ts (server only).

export const LESSON_9_MODEL = "claude-opus-5";
export const LESSON_9_MODELS = ["claude-opus-5", "claude-opus-5-5", "claude-sonnet-5", "claude-sonnet-5-5"];
export const LESSON_9_MAX_TOKENS = 1024; // the lesson's value; raise it on the page for longer answers

export type PresetId = "deepwiki" | "mslearn" | "linear" | "custom";

// The MCP connector connects from Anthropic's servers, so a server must be reachable on the public internet.
export const PRESETS: Record<Exclude<PresetId, "custom">, {
  label: string;
  name: string;
  url: string;
  auth: "none" | "env";
  about: string;
  samples: string[];
}> = {
  deepwiki: {
    label: "DeepWiki",
    name: "deepwiki",
    url: "https://mcp.deepwiki.com/mcp",
    auth: "none",
    about: "Docs and Q&A for public GitHub repositories. Free, no login.",
    samples: [
      "What tools do you have available?",
      "What topics does the documentation for the modelcontextprotocol/typescript-sdk repository cover? List them briefly.",
      "In the anthropics/anthropic-sdk-typescript repository, how does the tool runner decide when to stop looping? Answer in 3 bullets.",
    ],
  },
  mslearn: {
    label: "Microsoft Learn",
    name: "mslearn",
    url: "https://learn.microsoft.com/api/mcp",
    auth: "none",
    about: "Search and fetch official Microsoft and Azure documentation. Free, no login.",
    samples: [
      "What tools do you have available?",
      "How do I create an Azure Storage account with the Azure CLI? Give the command and link the doc page you used.",
    ],
  },
  linear: {
    label: "Linear (lesson)",
    name: "linear",
    url: "https://mcp.linear.app/mcp",
    auth: "env",
    about: "The lesson's server. Needs LINEAR_MCP_TOKEN in .env.local (restart the server after adding it).",
    samples: ["What tools do you have available?", "List my 5 most recently updated Linear issues with their status."],
  },
};

export type ServerChoice =
  | { preset: Exclude<PresetId, "custom"> }
  | { preset: "custom"; name: string; url: string; token?: string };

export const COMPARISON = [
  { feature: "Tools", job: "Connect Claude to YOUR systems (database, internal APIs)", maintains: "You" },
  { feature: "Skills", job: "Teach Claude YOUR procedure (templates, checklists)", maintains: "You (instructions, not integrations)" },
  { feature: "MCP", job: "Connect Claude to THIRD-PARTY services (Asana, Slack, Linear…)", maintains: "The service provider" },
];

export const LESSON_9_SNIPPET = `const response = await client.beta.messages.create({
  model: "claude-opus-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "What tools do you have available?" }],
  mcp_servers: [{
    type: "url",
    url: "https://mcp.linear.app/mcp",
    name: "linear",
    authorization_token: process.env.LINEAR_MCP_TOKEN,
  }],
  tools: [{ type: "mcp_toolset", mcp_server_name: "linear" }],
  betas: ["mcp-client-2025-11-20"],
});`;

export const FILTER_SNIPPET = `tools: [{
  type: "mcp_toolset",
  mcp_server_name: "slack",
  default_config: { enabled: false },          // everything off...
  configs: {
    search_messages: { enabled: true },         // ...except these
    list_channels:   { enabled: true },
  },
}]`;
