// Lesson 7: Response streaming. Run: npm run api-lesson7
import type Anthropic from "@anthropic-ai/sdk";
import { addUserMessage, client, model } from "./helpers.mts";

const messages: Anthropic.MessageParam[] = [];
addUserMessage(messages, "Write a 1 sentence description of a fake database");

// 1. Raw events: stream: true (Python: stream=True)
console.log("--- Raw events ---");
const stream = await client.messages.create({ model, max_tokens: 1000, messages, stream: true });
for await (const event of stream) {
  const extra = event.type === "content_block_delta" && event.delta.type === "text_delta" ? ` ${JSON.stringify(event.delta.text)}` : "";
  console.log(event.type + extra);
}

// 2. Text only, then the final message (Python: text_stream and get_final_message())
console.log("\n--- Text stream ---");
const textStream = client.messages.stream({ model, max_tokens: 1000, messages });
textStream.on("text", (text) => process.stdout.write(text));
const finalMessage = await textStream.finalMessage();
console.log(`\n\nfinal message: ${finalMessage.id}, stop_reason ${finalMessage.stop_reason}, ${finalMessage.usage.output_tokens} output tokens`);
