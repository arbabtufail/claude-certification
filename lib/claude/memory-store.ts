// MEMORY TOOL STORAGE (server only)
// Lesson 10: Claude reads and writes a /memories directory through the memory tool; YOU decide where it lives.
// This backend keeps it in the project's .memory/ folder, so it survives restarts and new conversations.
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { betaMemoryTool, type MemoryToolHandlers } from "@anthropic-ai/sdk/helpers/beta/memory";

const ROOT = path.join(process.cwd(), ".memory");

// Claude uses paths like "/memories/notes.md". Map them into ROOT and refuse anything that escapes it.
function toDisk(p: string): string {
  if (p !== "/memories" && !p.startsWith("/memories/")) throw new Error(`Path must be inside /memories: ${p}`);
  const full = path.resolve(ROOT, "." + p.slice("/memories".length));
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw new Error(`Path escapes /memories: ${p}`);
  return full;
}

async function exists(p: string) {
  return stat(p).then(() => true, () => false);
}

async function listTree(dir: string, prefix: string, depth: number): Promise<string[]> {
  const out: string[] = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(`${rel}/`);
      if (depth > 1) out.push(...(await listTree(path.join(dir, entry.name), rel, depth - 1)));
    } else {
      out.push(`${rel} (${(await stat(path.join(dir, entry.name))).size} bytes)`);
    }
  }
  return out;
}

const handlers: MemoryToolHandlers = {
  async view({ path: p, view_range }) {
    const disk = toDisk(p);
    await mkdir(ROOT, { recursive: true });
    if (!(await exists(disk))) throw new Error(`The path ${p} does not exist.`);
    if ((await stat(disk)).isDirectory()) {
      const items = await listTree(disk, p.replace(/\/$/, ""), 2);
      return `Directory ${p}:\n${items.length ? items.join("\n") : "(empty)"}`;
    }
    const lines = (await readFile(disk, "utf8")).split("\n");
    const [from, to] = view_range ?? [1, lines.length];
    return lines.slice(from - 1, to === -1 ? undefined : to).map((l, i) => `${String(from + i).padStart(6)}\t${l}`).join("\n");
  },
  async create({ path: p, file_text }) {
    const disk = toDisk(p);
    await mkdir(path.dirname(disk), { recursive: true });
    await writeFile(disk, file_text, "utf8");
    return `File created successfully at ${p}`;
  },
  async str_replace({ path: p, old_str, new_str }) {
    const disk = toDisk(p);
    const text = await readFile(disk, "utf8");
    const count = text.split(old_str).length - 1;
    if (count !== 1) throw new Error(`old_str must appear exactly once in ${p} (found ${count}).`);
    await writeFile(disk, text.replace(old_str, new_str), "utf8");
    return `Edited ${p}`;
  },
  async insert({ path: p, insert_line, insert_text }) {
    const disk = toDisk(p);
    const lines = (await readFile(disk, "utf8")).split("\n");
    lines.splice(insert_line, 0, insert_text);
    await writeFile(disk, lines.join("\n"), "utf8");
    return `Inserted text at line ${insert_line} of ${p}`;
  },
  async delete({ path: p }) {
    const disk = toDisk(p);
    if (disk === ROOT) throw new Error("Refusing to delete the /memories root.");
    await rm(disk, { recursive: true, force: true });
    return `Deleted ${p}`;
  },
  async rename({ old_path, new_path }) {
    const to = toDisk(new_path);
    await mkdir(path.dirname(to), { recursive: true });
    await rename(toDisk(old_path), to);
    return `Renamed ${old_path} to ${new_path}`;
  },
};

// The SDK helper turns these handlers into a runnable tool: { type: "memory_20250818", name: "memory" }.
export const memoryTool = () => betaMemoryTool(handlers);

// For the page: every memory file and its contents.
export async function readAllMemories(): Promise<{ path: string; content: string }[]> {
  if (!(await exists(ROOT))) return [];
  const files: { path: string; content: string }[] = [];
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else files.push({ path: "/memories/" + path.relative(ROOT, full).split(path.sep).join("/"), content: await readFile(full, "utf8") });
    }
  }
  await walk(ROOT);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export async function clearMemories() {
  await rm(ROOT, { recursive: true, force: true });
}
