// LESSON 8 (server only): read the skill folder from disk so it can be shown and uploaded.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SkillFile } from "@/lib/claude/skills";
import { SKILL_FOLDER } from "./lesson-08";

const SKILL_DIR = path.join(process.cwd(), "skills", SKILL_FOLDER);

export async function readSkillFiles(): Promise<SkillFile[]> {
  const files: SkillFile[] = [];
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else files.push({ path: path.relative(SKILL_DIR, full).split(path.sep).join("/"), content: await readFile(full, "utf8") });
    }
  }
  await walk(SKILL_DIR);
  // SKILL.md first, then the rest alphabetically
  return files.sort((a, b) => (a.path === "SKILL.md" ? -1 : b.path === "SKILL.md" ? 1 : a.path.localeCompare(b.path)));
}

// The page lets you edit SKILL.md before uploading; every other file comes from disk unchanged.
export async function skillFilesWith(skillMd: unknown): Promise<SkillFile[]> {
  const files = await readSkillFiles();
  if (typeof skillMd !== "string" || !skillMd.trim()) return files;
  return files.map((f) => (f.path === "SKILL.md" ? { ...f, content: skillMd } : f));
}
