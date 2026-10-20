// Lesson 4 script: the course's Python agent loop, written in TypeScript. Run: npm run lesson4
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// The tools array tells Claude what's available:
// a name, a description, and a JSON schema for the inputs.
const tools: Anthropic.Tool[] = [
  {
    name: "get_weather",
    description: "Get the current weather for a city.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "The city to get weather for" },
      },
      required: ["city"],
    },
  },
];

// run_tool is just a hardcoded lookup.
// In a real app, this would hit your database, an API, whatever.
function runTool(name: string, input: { city: string }): string {
  if (name === "get_weather") return `Weather in ${input.city}: 95F, sunny`;
  throw new Error(`Unknown tool: ${name}`);
}

const messages: Anthropic.MessageParam[] = [{ role: "user", content: "What should I wear in Austin today?" }];

// The agent loop. Each iteration sends messages to Claude and switches on the response's stop reason.
for (let turn = 1; ; turn++) {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools,
    messages,
  });
  console.log(`\n--- Turn ${turn}: stop_reason = ${response.stop_reason}`);

  if (response.stop_reason === "tool_use") {
    // Find the tool use blocks in the response and run each one.
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = runTool(block.name, block.input as { city: string });
        console.log(`Tool call: ${block.name}(${JSON.stringify(block.input)}) -> ${result}`);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }

    // Push the assistant's response and our tool results back into messages,
    // then loop again so Claude can answer.
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
    continue;
  }

  // end_turn: Claude is done. Print the final text and stop.
  // (Any other stop reason, like max_tokens, also ends the loop here so it can't spin forever.)
  for (const block of response.content) {
    if (block.type === "text") console.log(block.text);
  }
  break;
}
