// Lesson 10 script: prompt caching and server-side compaction, printed in the terminal. Run: npm run lesson10
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ---------- Pattern 3: prompt caching ----------
// A stable ~6k-token system prompt (fake policy text). Same bytes every call = cacheable prefix.
const policy = Array.from({ length: 120 }, (_, i) =>
  `Policy ${i + 1}: requests of type ${i % 7} must be reviewed within ${(i % 5) + 1} business days and logged with an owner and a due date.`,
).join("\n");

for (const question of ["Summarize policy 7 in one line.", "Summarize policy 42 in one line."]) {
  const r = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 256,
    system: [{ type: "text", text: `You answer questions about these policies.\n\n${policy}`, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: question }],
  });
  console.log(`[caching] "${question}"`);
  console.log(`  cache_creation_input_tokens=${r.usage.cache_creation_input_tokens} cache_read_input_tokens=${r.usage.cache_read_input_tokens} input_tokens=${r.usage.input_tokens}`);
}

// ---------- Pattern 2: server-side compaction ----------
// ~77k tokens of conversation; trigger at the 50k minimum. Haiku 5.5 keeps it cheap.
const days = Array.from({ length: 300 }, (_, d) =>
  `### Day ${d + 1}\n` + ["Priya", "Tom", "Lena", "Marco", "Aisha", "Ken"].map((n, i) =>
    `- ${n} worked on routine item ${(d * 3 + i * 5) % 8} for the checkout project (day ${d + 1}, item ${i + 1}).`).join("\n") +
  (d === 11 ? "\n- DECISION: we chose PostgreSQL 16 for the orders service." : ""),
);
const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [];
for (let i = 0; i < days.length; i += 50) {
  messages.push({ role: "user", content: `Project log part ${i / 50 + 1}:\n\n${days.slice(i, i + 50).join("\n\n")}` });
  messages.push({ role: "assistant", content: `Read part ${i / 50 + 1}.` });
}
messages.push({ role: "user", content: "Which database did we choose for the orders service?" });

const r = await client.beta.messages.create({
  betas: ["compact-2026-01-12"],
  model: "claude-haiku-5-5",
  max_tokens: 1024,
  context_management: { edits: [{ type: "compact_20260112", trigger: { type: "input_tokens", value: 50000 } }] },
  messages,
});
console.log(`\n[compaction] blocks: ${r.content.map((b) => b.type).join(", ")} · input_tokens=${r.usage.input_tokens}`);
for (const b of r.content) {
  if (b.type === "compaction") console.log(`  summary: ${(b.content ?? "").slice(0, 400).replace(/\s+/g, " ")}…`);
  if (b.type === "text") console.log(`  answer: ${b.text}`);
}
