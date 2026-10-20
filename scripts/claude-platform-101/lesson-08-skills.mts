// Lesson 8 script: upload the Skill once (or reuse it), then attach it to a messages.create call.
// Run: npm run lesson8
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const client = new Anthropic();
const FOLDER = "status-report-generator";
const DIR = path.join("skills", FOLDER);

// Like the Python files_from_dir(): every file, named "<folder>/<path inside the folder>"
async function filesFromDir(dir: string, base = dir): Promise<Awaited<ReturnType<typeof toFile>>[]> {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesFromDir(full, base)));
    else out.push(await toFile(await readFile(full), `${FOLDER}/${path.relative(base, full).split(path.sep).join("/")}`));
  }
  return out;
}

// Upload once: reuse the Skill if one with this name is already in the workspace.
let skillId: string | undefined;
for await (const s of client.skills.list({ source: "custom" })) {
  if (s.display_name === "Status Report Generator") skillId = s.id;
}
if (!skillId) {
  const skill = await client.skills.create({ display_name: "Status Report Generator", files: await filesFromDir(DIR) });
  skillId = skill.id;
  console.log("Uploaded new Skill:", skillId);
} else {
  console.log("Reusing Skill:", skillId);
}

const activityLog = `Project: Checkout v2 - Tuesday 14 Oct
09:10 Priya merged the new address form (PR 482)
10:15 Lena is blocked on the Apple Pay merchant certificate - waiting on Finance to approve the renewal
11:00 Priya fixed the coupon rounding bug
11:30 Tom: load test failing at 400 rps, looking into DB connection pool
13:05 Marco drafting the release notes for Friday's launch
14:20 Lena still waiting on Finance, launch is Friday 17 Oct`;

const response = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 4096,
  container: { skills: [{ type: "custom", skill_id: skillId, version: "latest" }] },
  tools: [{ type: "code_execution_20250825", name: "code_execution" }],
  messages: [{ role: "user", content: `Generate the daily status report from this activity log:\n\n${activityLog}` }],
});

console.log(`\nstop_reason: ${response.stop_reason}\n`);
for (const block of response.content) {
  if (block.type === "server_tool_use") console.log(`[${block.name}] ${JSON.stringify(block.input).slice(0, 160)}`);
  if (block.type === "text") process.stdout.write(block.text);
}
console.log();
