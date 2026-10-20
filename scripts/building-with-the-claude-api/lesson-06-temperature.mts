// Lesson 6: Temperature. Run: npm run api-lesson6
// Only claude-sonnet-4-5 and claude-haiku-4-5 accept a temperature other than 1; newer models return a 400.
import type Anthropic from "@anthropic-ai/sdk";
import { addUserMessage, chat } from "./helpers.mts";

const messages: Anthropic.MessageParam[] = [];
addUserMessage(messages, "Generate a one sentence movie idea");

for (const temperature of [0.0, 1.0]) {
  console.log(`\ntemperature ${temperature}:`);
  // Three runs each, to see how much the answers vary
  const answers = await Promise.all([1, 2, 3].map(() => chat(messages, { temperature })));
  answers.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
}
