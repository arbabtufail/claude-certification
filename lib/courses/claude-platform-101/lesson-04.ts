// LESSON 4 SETTINGS: The agent loop explained
import type Anthropic from "@anthropic-ai/sdk";
import type { ToolRunner } from "@/lib/claude/agent-loop";

export const LESSON_4_MODEL = "claude-sonnet-5";
export const LESSON_4_MAX_TOKENS = 1024;
export const LESSON_4_MAX_TURNS = 8;

// The tools array tells Claude what's available: a name, a description, and a JSON schema for the inputs.
// get_weather is the lesson's tool. get_air_quality is extra, so you can watch Claude call several tools at once.
export const LESSON_4_TOOLS: Anthropic.Tool[] = [
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
  {
    name: "get_air_quality",
    description: "Get the current air quality index (AQI) for a city. Lower is better; above 100 is unhealthy for sensitive groups.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "The city to get air quality for" },
      },
      required: ["city"],
    },
  },
];

// Fake data. In a real app, runTool would hit your database, an API, whatever.
const WEATHER: Record<string, string> = {
  austin: "95F, sunny",
  seattle: "58F, light rain",
  london: "61F, overcast",
  "new york": "72F, partly cloudy",
  karachi: "91F, humid haze",
  dubai: "104F, clear",
};
const AIR_QUALITY: Record<string, number> = {
  austin: 42,
  seattle: 18,
  london: 35,
  "new york": 55,
  karachi: 168,
  dubai: 97,
};

const SIMULATED_LATENCY_MS = 400; // so you can watch the tool step happen in the UI

export const runLesson4Tool: ToolRunner = async (name, input) => {
  const city = String(input.city ?? "");
  const key = city.trim().toLowerCase();
  await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS));

  if (name === "get_weather") {
    if (!WEATHER[key]) throw new Error(`No weather data for "${city}". Known cities: ${Object.keys(WEATHER).join(", ")}.`);
    return `Weather in ${city}: ${WEATHER[key]}`;
  }
  if (name === "get_air_quality") {
    if (AIR_QUALITY[key] === undefined) throw new Error(`No air quality data for "${city}".`);
    return `Air quality in ${city}: AQI ${AIR_QUALITY[key]}`;
  }
  throw new Error(`Unknown tool: ${name}`);
};

export const LESSON_4_DEFAULT_TOOLS = ["get_weather"]; // the lesson uses only get_weather

export function pickTools(names: unknown): Anthropic.Tool[] | null {
  if (!Array.isArray(names)) return null;
  const picked = LESSON_4_TOOLS.filter((t) => names.includes(t.name));
  return picked.length === names.length ? picked : null; // reject unknown names
}

export const LESSON_4_SAMPLES: { label: string; prompt: string; tools: string[]; expect: string }[] = [
  {
    label: "Lesson example",
    prompt: "What should I wear in Austin today?",
    tools: ["get_weather"],
    expect: "2 API calls: tool_use (get_weather), then end_turn",
  },
  {
    label: "Several tools at once",
    prompt: "I can go for an evening run in Seattle or Karachi. Which is better right now, and what should I wear?",
    tools: ["get_weather", "get_air_quality"],
    expect: "Several tool calls in one turn (weather + air quality for both cities)",
  },
  {
    label: "Tool error",
    prompt: "What should I wear in Reykjavik today?",
    tools: ["get_weather"],
    expect: "The tool fails (no data); Claude reads the error and answers anyway",
  },
  {
    label: "No tool needed",
    prompt: "Which fabrics keep you coolest in hot weather?",
    tools: ["get_weather"],
    expect: "1 API call: end_turn straight away, no tools",
  },
];
