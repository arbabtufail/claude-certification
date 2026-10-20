// Lesson 8: Structured data. Run: npm run api-lesson8
// Prefill only works on claude-sonnet-4-5 / claude-haiku-4-5 (the course's model). Newer models return a 400;
// the web page shows their replacement, structured outputs.
import type Anthropic from "@anthropic-ai/sdk";
import { addAssistantMessage, addUserMessage, chat } from "./helpers.mts";

const messages: Anthropic.MessageParam[] = [];
addUserMessage(messages, "Generate a very short event bridge rule as json");
addAssistantMessage(messages, "```json");

const text = await chat(messages, { stopSequences: ["```"] });
console.log("Raw reply:", JSON.stringify(text));

// Clean up and parse the JSON
const cleanJson = JSON.parse(text.trim());
console.log("\nParsed:", cleanJson);
