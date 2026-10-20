// Lesson 4: Multi-turn conversations. Run: npm run api-lesson4
import type Anthropic from "@anthropic-ai/sdk";
import { addAssistantMessage, addUserMessage, chat } from "./helpers.mts";

// Start with an empty message list
const messages: Anthropic.MessageParam[] = [];

// Add the initial user question and get Claude's response
addUserMessage(messages, "Define quantum computing in one sentence");
const answer = await chat(messages);
console.log("Claude:", answer);

// Add Claude's response to the history, then the follow-up
addAssistantMessage(messages, answer);
addUserMessage(messages, "Write another sentence");

// Sent with the full history (3 messages)
const finalAnswer = await chat(messages);
console.log("\nWith history:", finalAnswer);

// For comparison: the same follow-up with no history
const withoutHistory = await chat([{ role: "user", content: "Write another sentence" }]);
console.log("\nWithout history:", withoutHistory);
