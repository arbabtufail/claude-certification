// Lesson 5: System prompts. Run: npm run api-lesson5
import type Anthropic from "@anthropic-ai/sdk";
import { addUserMessage, chat } from "./helpers.mts";

const messages: Anthropic.MessageParam[] = [];
addUserMessage(messages, "How do I solve 5x + 2 = 3 for x?");

// Without system prompt
console.log("WITHOUT a system prompt:\n" + (await chat(messages)));

// With system prompt
const system = `
You are a patient math tutor.
Do not directly answer a student's questions.
Guide them to a solution step by step.
`;
console.log("\nWITH the math tutor system prompt:\n" + (await chat(messages, { system })));
