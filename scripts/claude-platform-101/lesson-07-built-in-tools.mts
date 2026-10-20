// Lesson 7 script: two server tools in one file, as in the course. Run: npm run lesson7
// No agent loop: Anthropic runs the tools and the results come back in the same response.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Call 1: web search. Anthropic runs the search server-side
const searchResponse = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 1024,
  tools: [{ type: "web_search_20260209", name: "web_search" }],
  messages: [{ role: "user", content: "What is Anthropic's latest model release? Answer in one sentence." }],
});

console.log("===== Web search  (stop_reason:", searchResponse.stop_reason + ")");
for (const block of searchResponse.content) {
  if (block.type === "server_tool_use") {
    console.log(`Tool call: ${block.name} — ${JSON.stringify(block.input)}`);
  } else if (block.type === "text") {
    process.stdout.write(block.text);
  }
}
console.log("\n");

// Call 2: code execution. Claude writes and runs Python in a sandbox
const codeResponse = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 1024,
  tools: [{ type: "code_execution_20260120", name: "code_execution" }],
  messages: [{ role: "user", content: "Calculate the mean and standard deviation of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]" }],
});

console.log("===== Code execution  (stop_reason:", codeResponse.stop_reason + ")");
for (const block of codeResponse.content) {
  if (block.type === "server_tool_use") {
    console.log(`Tool call: ${block.name} — ${JSON.stringify(block.input)}`);
  } else if (block.type === "bash_code_execution_tool_result") {
    if (block.content.type === "bash_code_execution_result") console.log(`stdout: ${block.content.stdout}`);
    else console.log(`error: ${block.content.error_code}`);
  } else if (block.type === "text") {
    console.log(block.text);
  }
}
