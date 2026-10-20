// THE CLIENT (server only: never import this from a "use client" component)
// new Anthropic() reads ANTHROPIC_API_KEY from the environment. Next.js loads .env.local automatically.
import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic({
  maxRetries: 2, // retries 429 / 5xx / network errors automatically
  timeout: 120_000, // milliseconds
});

export { Anthropic };
