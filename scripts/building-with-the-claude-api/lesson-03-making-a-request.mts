// Building with the Claude API, lesson 3: the course's Python notebook, in TypeScript.
// Run: npm run api-lesson3
//
// Python setup                             TypeScript setup
//   %pip install anthropic python-dotenv     npm install @anthropic-ai/sdk   (already in package.json)
//   .env file with ANTHROPIC_API_KEY         .env.local with ANTHROPIC_API_KEY (git-ignored)
//   load_dotenv()                            node --env-file=.env.local  (built into Node, no dotenv package)
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const model = "claude-sonnet-4-5";

const message = await client.messages.create({
  model,
  max_tokens: 1000,
  messages: [
    {
      role: "user",
      content: "What is quantum computing? Answer in one sentence",
    },
  ],
});

// Python: message.content[0].text
// TypeScript: content[0] could be another block type, so check .type first.
const first = message.content[0];
if (first?.type === "text") {
  console.log(first.text);
}

console.log(`\nstop_reason: ${message.stop_reason} | tokens: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out`);
