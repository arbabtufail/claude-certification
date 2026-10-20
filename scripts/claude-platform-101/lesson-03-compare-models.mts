// Lesson 3 script: the course's Python loop, written in TypeScript. Run: npm run lesson3
// Same prompt, same max_tokens. Only the model changes on each request.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const prompt = "Define 'API rate limiting' in two sentences.";
const models = ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-5-5"];

for (const model of models) {
  const started = performance.now();
  const response = await client.messages.create({
    model,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(2);

  // response.usage is what your bill is calculated on.
  console.log(`\n${model}  (${seconds}s)`, response.usage);
  for (const block of response.content) {
    if (block.type === "text") console.log(block.text);
  }
}
