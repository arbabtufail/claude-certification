// LESSON 5 TOOLS (server only): the functions, and the two ways of exposing them to Claude.
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { ToolRunner } from "@/lib/claude/agent-loop";
import { DESCRIPTION_STYLES, type DescriptionStyle } from "./lesson-05";

// ---------------------------------------------------------------------------------------------
// Your existing code: the functions the tools wrap. In a real app these already exist.
// ---------------------------------------------------------------------------------------------
const TODAY: Record<string, string> = {
  denver: "34F, snow flurries, wind 15 mph",
  austin: "95F, sunny",
  seattle: "58F, light rain",
  london: "61F, overcast",
  karachi: "91F, humid haze",
};
const NEXT_DAYS: Record<string, string[]> = {
  denver: ["Day 1: 41F, partly cloudy", "Day 2: 52F, sunny", "Day 3: 58F, sunny"],
  austin: ["Day 1: 97F, sunny", "Day 2: 94F, thunderstorms", "Day 3: 90F, partly cloudy"],
  seattle: ["Day 1: 60F, rain", "Day 2: 62F, showers", "Day 3: 65F, cloudy"],
  london: ["Day 1: 59F, drizzle", "Day 2: 63F, cloudy", "Day 3: 66F, sunny spells"],
  karachi: ["Day 1: 92F, hazy", "Day 2: 93F, hazy", "Day 3: 90F, breezy"],
};

const delay = () => new Promise((r) => setTimeout(r, 300)); // simulated lookup time, so you can watch the step

export async function getWeather(city: string): Promise<string> {
  await delay();
  const today = TODAY[city.trim().toLowerCase()];
  if (!today) throw new Error(`No weather data for "${city}". Known cities: ${Object.keys(TODAY).join(", ")}.`);
  return `Today in ${city}: ${today}`;
}

export async function getForecast(city: string): Promise<string> {
  await delay();
  const days = NEXT_DAYS[city.trim().toLowerCase()];
  if (!days) throw new Error(`No forecast for "${city}". Known cities: ${Object.keys(NEXT_DAYS).join(", ")}.`);
  return `Forecast for ${city}: ${days.join("; ")}`;
}

// ---------------------------------------------------------------------------------------------
// Way 1: the manual loop. Hand-written JSON schemas + a switch on the tool name.
// ---------------------------------------------------------------------------------------------
export function jsonTools(style: DescriptionStyle): Anthropic.Tool[] {
  const d = DESCRIPTION_STYLES[style];
  return [
    {
      name: "get_weather",
      description: d.weather,
      input_schema: {
        type: "object",
        properties: { city: { type: "string", description: "The city to check" } },
        required: ["city"],
      },
    },
    {
      name: "get_forecast",
      description: d.forecast,
      input_schema: {
        type: "object",
        properties: { city: { type: "string", description: "The city to check" } },
        required: ["city"],
      },
    },
  ];
}

// Want a third tool? Add it to the array above and add a case here.
export const runLesson5Tool: ToolRunner = (name, input) => {
  switch (name) {
    case "get_weather":
      return getWeather(String(input.city));
    case "get_forecast":
      return getForecast(String(input.city));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};

// ---------------------------------------------------------------------------------------------
// Way 2: the tool runner. Each tool is defined once, with a Zod schema that also validates input.
// ---------------------------------------------------------------------------------------------
export function zodTools(style: DescriptionStyle) {
  const d = DESCRIPTION_STYLES[style];
  return [
    betaZodTool({
      name: "get_weather",
      description: d.weather,
      inputSchema: z.object({ city: z.string().describe("The city to check") }),
      run: async ({ city }) => getWeather(city),
    }),
    betaZodTool({
      name: "get_forecast",
      description: d.forecast,
      inputSchema: z.object({ city: z.string().describe("The city to check") }),
      run: async ({ city }) => getForecast(city),
    }),
  ];
}
