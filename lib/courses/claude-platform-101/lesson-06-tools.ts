// LESSON 6 TOOLS (server only): the road trip agent's weather tool, and turning a setting into request params.
import type Anthropic from "@anthropic-ai/sdk";
import type { ToolRunner } from "@/lib/claude/agent-loop";
import type { Effort } from "@/lib/claude/send";
import type { ThinkingSetting } from "./lesson-06";

// The lesson's tool, word for word.
export const WEATHER_TOOL: Anthropic.Tool = {
  name: "get_weather",
  description: "Get the current weather for a city.",
  input_schema: {
    type: "object",
    properties: { city: { type: "string", description: "City name" } },
    required: ["city"],
  },
};

// Mock weather for places a road trip out of San Francisco might go. Some are great, some are not.
const WEATHER: Record<string, string> = {
  "san francisco": "62F, foggy",
  monterey: "66F, sunny, light breeze",
  carmel: "65F, sunny",
  "carmel-by-the-sea": "65F, sunny",
  "big sur": "58F, dense fog, Highway 1 closure reported near Ragged Point",
  "santa cruz": "70F, sunny",
  napa: "88F, sunny",
  sonoma: "86F, sunny",
  "lake tahoe": "41F, snow showers, chains required on I-80",
  "south lake tahoe": "40F, snow showers, chains required on US-50",
  yosemite: "45F, light snow, Tioga Road closed",
  sacramento: "97F, clear, heat advisory",
  mendocino: "60F, light rain",
  "half moon bay": "59F, foggy",
  "point reyes": "57F, windy, foggy",
  "san luis obispo": "75F, sunny",
  "paso robles": "92F, sunny",
  "santa barbara": "74F, sunny",
  "los angeles": "81F, hazy",
};

const CONDITIONS = ["68F, sunny", "61F, cloudy", "55F, light rain", "73F, partly cloudy", "79F, clear"];

export const runLesson6Tool: ToolRunner = async (name, input) => {
  if (name !== "get_weather") throw new Error(`Unknown tool: ${name}`);
  const city = String(input.city ?? "").trim();
  await new Promise((r) => setTimeout(r, 300)); // simulated lookup time
  // Strip a trailing ", CA" etc. so "Monterey, CA" matches.
  const key = city.toLowerCase().replace(/,.*$/, "").trim();
  const known = WEATHER[key];
  // Unknown places still get plausible fake weather, picked from the name so it stays the same between runs.
  const fallback = CONDITIONS[[...key].reduce((n, ch) => n + ch.charCodeAt(0), 0) % CONDITIONS.length];
  return `Weather in ${city}: ${known ?? fallback}`;
};

// Turn the page's setting into the two request parameters the lesson talks about.
export function thinkingParams(
  setting: ThinkingSetting,
  display: "summarized" | "omitted",
): { thinking: Anthropic.ThinkingConfigParam; effort?: Effort } {
  if (setting === "off") return { thinking: { type: "disabled" } };
  return { thinking: { type: "adaptive", display }, effort: setting };
}
