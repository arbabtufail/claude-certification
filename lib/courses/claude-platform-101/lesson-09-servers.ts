// LESSON 9 (server only): turn the page's server choice into a connection, adding secrets from the environment.
import type { McpServer } from "@/lib/claude/mcp";
import { PRESETS, type ServerChoice } from "./lesson-09";

export const linearConfigured = () => Boolean(process.env.LINEAR_MCP_TOKEN);

export function resolveServer(choice: unknown): McpServer | { error: string } {
  const c = choice as ServerChoice | undefined;
  if (!c || typeof c !== "object") return { error: "Pick a server" };

  if (c.preset === "custom") {
    let url: URL;
    try {
      url = new URL(String(c.url));
    } catch {
      return { error: "Custom server URL is not valid" };
    }
    if (url.protocol !== "https:") return { error: "Custom server URL must use https" };
    const name = String(c.name ?? "");
    if (!/^[a-z0-9_-]{1,40}$/.test(name)) return { error: "Server name: lowercase letters, digits, - or _ only" };
    return { name, url: url.toString(), token: typeof c.token === "string" && c.token.trim() ? c.token.trim() : undefined };
  }

  const preset = PRESETS[c.preset];
  if (!preset) return { error: "Unknown server" };
  if (preset.auth === "env") {
    const token = process.env.LINEAR_MCP_TOKEN;
    if (!token) return { error: "LINEAR_MCP_TOKEN is not set in .env.local (restart the server after adding it)" };
    return { name: preset.name, url: preset.url, token };
  }
  return { name: preset.name, url: preset.url };
}
