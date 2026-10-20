// Lesson 6 script: the course's Python thinking example, in TypeScript, with the agent loop around it
// so Claude can actually call the weather tool. Run: npm run lesson6
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const weatherTool: Anthropic.Tool = {
  name: "get_weather",
  description: "Get the current weather for a city.",
  input_schema: {
    type: "object",
    properties: { city: { type: "string", description: "City name" } },
    required: ["city"],
  },
};

// Mock lookup
const weather: Record<string, string> = {
  monterey: "66F, sunny", "santa cruz": "70F, sunny", napa: "88F, sunny",
  "lake tahoe": "41F, snow showers, chains required", yosemite: "45F, light snow, Tioga Road closed",
  "big sur": "58F, dense fog", mendocino: "60F, light rain", sacramento: "97F, heat advisory",
};
const getWeather = (city: string) => `Weather in ${city}: ${weather[city.toLowerCase().replace(/,.*$/, "").trim()] ?? "68F, sunny"}`;

const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "Plan a road trip out of San Francisco with two stops, weighing weather and drive time." },
];

for (let turn = 1; turn <= 10; turn++) {
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive", display: "summarized" }, // summarized = return the reasoning text
    output_config: { effort: "high" }, // low | medium | high | xhigh | max
    tools: [weatherTool],
    messages,
  });
  console.log(`\n===== Turn ${turn}: stop_reason = ${response.stop_reason}`);

  // Print every block so you can see thinking -> tool calls -> text
  for (const block of response.content) {
    if (block.type === "thinking") console.log(`\n[thinking]\n${block.thinking || "(empty)"}`);
    if (block.type === "text") console.log(`\n[text]\n${block.text}`);
    if (block.type === "tool_use") console.log(`\n[tool_use] ${block.name}(${JSON.stringify(block.input)})`);
  }

  if (response.stop_reason !== "tool_use") break;

  // Keep thinking blocks unchanged in the history, then answer every tool call
  messages.push({ role: "assistant", content: response.content });
  messages.push({
    role: "user",
    content: response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ type: "tool_result" as const, tool_use_id: b.id, content: getWeather(String((b.input as { city: string }).city)) })),
  });
}
