// LESSON 5 SETTINGS: What is tool use?
// Plain data, safe for the browser. The tools themselves are in lesson-05-tools.ts (server only).

export const LESSON_5_MODEL = "claude-sonnet-5";
export const LESSON_5_MAX_TOKENS = 1024;
export const LESSON_5_MAX_TURNS = 8;

// ---------------------------------------------------------------------------------------------
// Tool descriptions. "The description is what Claude reads to decide whether to call the tool."
// Switch between these on the page and watch which tool Claude picks.
// ---------------------------------------------------------------------------------------------
export type DescriptionStyle = "specific" | "vague" | "swapped";

export const DESCRIPTION_STYLES: Record<DescriptionStyle, { label: string; help: string; weather: string; forecast: string }> = {
  specific: {
    label: "Specific (lesson)",
    help: "Each description says exactly what the tool returns.",
    weather: "Get today's current weather for a city.",
    forecast: "Get the weather forecast for the next few days for a city.",
  },
  vague: {
    label: "Vague",
    help: "Both descriptions say almost nothing. Claude has to guess from the names.",
    weather: "Weather data.",
    forecast: "Weather data.",
  },
  swapped: {
    label: "Swapped (misleading)",
    help: "The descriptions are swapped. Does Claude trust the name or the description?",
    weather: "Get the weather forecast for the next few days for a city.",
    forecast: "Get today's current weather for a city.",
  },
};

export function isDescriptionStyle(v: unknown): v is DescriptionStyle {
  return v === "specific" || v === "vague" || v === "swapped";
}

// ---------------------------------------------------------------------------------------------
// Samples
// ---------------------------------------------------------------------------------------------
export const LESSON_5_SAMPLES: { label: string; prompt: string; expect: string }[] = [
  {
    label: "Denver trip (lesson)",
    prompt: "I'm packing for a three-day trip to Denver. What's the weather today and over the next few days?",
    expect: "get_weather and get_forecast (same turn or one after the other), then: pack layers, snow today, warming up",
  },
  {
    label: "Only today",
    prompt: "Do I need an umbrella in Seattle right now?",
    expect: "Only get_weather: the prompt is about right now",
  },
  {
    label: "Only the next days",
    prompt: "Will the weekend in London be any nicer than usual? I only care about the coming days.",
    expect: "Only get_forecast: the prompt is about the coming days",
  },
  {
    label: "Two cities",
    prompt: "Compare today and the next three days in Austin and Karachi. Which is better for a week outdoors?",
    expect: "Four tool calls (two tools x two cities), usually all in one turn",
  },
];

// The code each way needs, shown on the page so you can compare.
export const MANUAL_LOOP_SNIPPET = `function runTool(name, input) {
  switch (name) {
    case "get_weather":  return getWeather(input.city);
    case "get_forecast": return getForecast(input.city);
  }
}

while (true) {
  const response = await client.messages.create({
    model: "claude-sonnet-5", max_tokens: 1024, messages, tools,
  });
  if (response.stop_reason !== "tool_use") break; // final answer

  messages.push({ role: "assistant", content: response.content });
  const toolResults = response.content
    .filter((block) => block.type === "tool_use")
    .map((block) => ({
      type: "tool_result",
      tool_use_id: block.id,
      content: runTool(block.name, block.input),
    }));
  messages.push({ role: "user", content: toolResults });
}`;

export const TOOL_RUNNER_SNIPPET = `const weatherTool = betaZodTool({
  name: "get_weather",
  description: "Get today's current weather for a city.",
  inputSchema: z.object({ city: z.string().describe("The city to check") }),
  run: async ({ city }) => getWeather(city),
});
const forecastTool = betaZodTool({ /* same shape, get_forecast */ });

const finalMessage = await client.beta.messages.toolRunner({
  model: "claude-sonnet-5", max_tokens: 1024,
  messages: [{ role: "user", content: prompt }],
  tools: [weatherTool, forecastTool],
});`;
