// /api/claude-platform-101/lesson-08/skills
//   GET    -> the local skill files + the custom Skills already uploaded to your workspace
//   POST   -> { action: "create" } uploads a new Skill; { action: "version", skillId } uploads a new version
//   DELETE -> ?id=skill_... deletes a Skill (all its versions first)
import { createSkill, createSkillVersion, deleteSkill, listCustomSkills, listVersions } from "@/lib/claude/skills";
import { describeError } from "@/lib/claude/errors";
import { SKILL_DISPLAY_NAME, SKILL_FOLDER } from "@/lib/courses/claude-platform-101/lesson-08";
import { readSkillFiles, skillFilesWith } from "@/lib/courses/claude-platform-101/lesson-08-skill";

const isSkillId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{4,100}$/.test(v);

async function uploadedSkills() {
  const skills = await listCustomSkills();
  return Promise.all(
    skills.map(async (s) => ({
      id: s.id,
      display_name: s.display_name,
      latest_version_id: s.latest_version_id,
      updated_at: s.updated_at,
      versions: (await listVersions(s.id)).length,
    })),
  );
}

export async function GET() {
  try {
    return Response.json({ files: await readSkillFiles(), uploaded: await uploadedSkills() });
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}

export async function POST(req: Request) {
  const { action, skillId, skillMd } = await req.json();
  try {
    const files = await skillFilesWith(skillMd);
    if (action === "create") {
      const skill = await createSkill(SKILL_FOLDER, files, SKILL_DISPLAY_NAME);
      return Response.json({ created: skill.id, uploaded: await uploadedSkills() });
    }
    if (action === "version" && isSkillId(skillId)) {
      const version = await createSkillVersion(skillId, SKILL_FOLDER, files);
      return Response.json({ version: version.id, uploaded: await uploadedSkills() });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!isSkillId(id)) return Response.json({ error: "Missing skill id" }, { status: 400 });
  try {
    await deleteSkill(id);
    return Response.json({ deleted: id, uploaded: await uploadedSkills() });
  } catch (err) {
    const { status, error } = describeError(err);
    return Response.json({ error }, { status });
  }
}
