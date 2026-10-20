// LESSON 8 SETTINGS: Skills
// Plain data, safe for the browser. Reading the skill folder from disk is in lesson-08-skill.ts (server only).
import type Anthropic from "@anthropic-ai/sdk";

export const LESSON_8_MODEL = "claude-opus-5";
export const LESSON_8_MODELS = ["claude-opus-5", "claude-opus-5-5", "claude-sonnet-5", "claude-sonnet-5-5"];
export const LESSON_8_MAX_TOKENS = 4096;

// The skill lives in this repo at skills/status-report-generator/ (SKILL.md, template.md, scripts/log_stats.py).
export const SKILL_FOLDER = "status-report-generator";
export const SKILL_DISPLAY_NAME = "Status Report Generator";

// Skills run inside the code execution container, so the tool is required when a Skill is attached.
export const CODE_EXECUTION_TOOL: Anthropic.ToolUnion = { type: "code_execution_20250825", name: "code_execution" };

export function skillContainer(skillId: string): Anthropic.ContainerParams {
  return { skills: [{ type: "custom", skill_id: skillId, version: "latest" }] };
}

// The user prompt is one line; the procedure lives in the Skill.
export const reportPrompt = (log: string) => `Generate the daily status report from this activity log:\n\n${log}`;

export const ACTIVITY_LOGS: { label: string; log: string }[] = [
  {
    label: "Checkout v2 team",
    log: `Project: Checkout v2 - Tuesday 14 Oct
09:10 Priya merged the new address form (PR 482)
09:40 Tom started load testing the payment service
10:15 Lena is blocked on the Apple Pay merchant certificate - waiting on Finance to approve the renewal
11:00 Priya fixed the coupon rounding bug
11:30 Tom: load test failing at 400 rps, looking into DB connection pool
13:05 Marco drafting the release notes for Friday's launch
14:20 Lena still waiting on Finance, launch is Friday 17 Oct
15:45 Priya deployed address form to staging
16:30 Marco reviewing analytics events with Data team`,
  },
  {
    label: "Quiet day, messy log",
    log: `sam - fixed flaky login test (finally!!)
sam - closed 3 old tickets
jo: working on onboarding email copy, 50% done
jo: lunch w/ design team, talked about icons
kai shipped dark mode to 10% of users 🎉
kai - started looking at the crash report from v3.2`,
  },
];

export const UPLOAD_SNIPPET = `const skill = await client.skills.create({
  display_name: "Status Report Generator",
  files: [ // every file under one folder, SKILL.md at its root
    await toFile(skillMd,   "status-report-generator/SKILL.md"),
    await toFile(template,  "status-report-generator/template.md"),
    await toFile(statsPy,   "status-report-generator/scripts/log_stats.py"),
  ],
});
console.log(skill.id); // reference this ID in future requests`;

export const ATTACH_SNIPPET = `const response = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 4096,
  container: {
    skills: [{ type: "custom", skill_id: skill.id, version: "latest" }],
  },
  tools: [{ type: "code_execution_20250825", name: "code_execution" }],
  messages: [{
    role: "user",
    content: \`Generate the daily status report from this activity log:\\n\\n\${activityLog}\`,
  }],
});`;
