// Lesson 5 script: the same two-tool weather demo, wired through the tool runner. Run: npm run lesson5
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const client = new Anthropic();

// Your existing functions (mock data here)
const getWeather = (city: string) => `Today in ${city}: 34F, snow flurries, wind 15 mph`;
const getForecast = (city: string) => `Forecast for ${city}: Day 1: 41F, partly cloudy; Day 2: 52F, sunny; Day 3: 58F, sunny`;

// Wrap the same two lookups, each with a short Zod schema
const weatherTool = betaZodTool({
  name: "get_weather",
  description: "Get today's current weather for a city.",
  inputSchema: z.object({
    city: z.string().describe("The city to check"),
  }),
  run: async ({ city }) => {
    console.log(`> runner called get_weather({ city: "${city}" })`);
    return getWeather(city);
  },
});

const forecastTool = betaZodTool({
  name: "get_forecast",
  description: "Get the weather forecast for the next few days for a city.",
  inputSchema: z.object({
    city: z.string().describe("The city to check"),
  }),
  run: async ({ city }) => {
    console.log(`> runner called get_forecast({ city: "${city}" })`);
    return getForecast(city);
  },
});

const runner = client.beta.messages.toolRunner({
  model: "claude-sonnet-5",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: "I'm packing for a three-day trip to Denver. What's the weather today and over the next few days?",
    },
  ],
  tools: [weatherTool, forecastTool],
});

// Await the runner to get the final message after all the tool ping-pong has settled
const finalMessage = await runner;

console.log(`\nstop_reason: ${finalMessage.stop_reason}\n`);
for (const block of finalMessage.content) {
  if (block.type === "text") console.log(block.text);
}
