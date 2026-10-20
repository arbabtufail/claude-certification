// SKILLS API (server only)
// Lesson 8: a Skill is a folder (SKILL.md + any scripts/resources) uploaded once to your workspace,
// then attached to any messages.create call by ID through container.skills.
import { toFile } from "@anthropic-ai/sdk";
import { Anthropic, client } from "./client";

export type SkillFile = { path: string; content: string }; // path inside the skill folder, e.g. "scripts/log_stats.py"

// Every uploaded file must sit under ONE top-level folder, with SKILL.md at its root:
// "status-report-generator/SKILL.md", "status-report-generator/scripts/log_stats.py", ...
async function asUploads(folder: string, files: SkillFile[]) {
  return Promise.all(files.map((f) => toFile(Buffer.from(f.content, "utf8"), `${folder}/${f.path}`)));
}

export async function createSkill(folder: string, files: SkillFile[], displayName: string) {
  return client.skills.create({ display_name: displayName, files: await asUploads(folder, files) });
}

// Upload changed files as a new version. Requests using version "latest" pick it up immediately.
export async function createSkillVersion(skillId: string, folder: string, files: SkillFile[]) {
  return client.skills.versions.create(skillId, { files: await asUploads(folder, files) });
}

export async function listCustomSkills() {
  const skills = [];
  for await (const skill of client.skills.list({ source: "custom" })) skills.push(skill);
  return skills;
}

export async function listVersions(skillId: string) {
  const versions = [];
  for await (const v of client.skills.versions.list(skillId)) versions.push(v);
  return versions;
}

// Delete the Skill itself (tested: this works with its last version still attached; the API refuses to
// delete a Skill's only version on its own). If the API asks for fewer versions first, remove the older
// ones and try again.
export async function deleteSkill(skillId: string) {
  try {
    return await client.skills.delete(skillId);
  } catch (err) {
    if (!(err instanceof Anthropic.BadRequestError)) throw err;
    const { latest_version_id } = await client.skills.retrieve(skillId);
    for (const v of (await listVersions(skillId)).filter((v) => v.id !== latest_version_id)) {
      await client.skills.versions.delete(v.id, { skill_id: skillId });
    }
    return client.skills.delete(skillId);
  }
}
