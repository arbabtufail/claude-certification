// ERRORS (server only)
// The SDK throws typed errors. Check the most specific ones first.
import { Anthropic } from "./client";

export function describeError(err: unknown): { status: number; error: string } {
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 401, error: "Invalid API key. Check ANTHROPIC_API_KEY in .env.local." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, error: "Rate limited. Wait a moment and try again." };
  }
  if (err instanceof Anthropic.BadRequestError) {
    return { status: 400, error: `Bad request: ${err.message}` };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 502, error: "Could not reach the Claude API. Check your internet connection." };
  }
  if (err instanceof Anthropic.APIError) {
    return { status: err.status ?? 500, error: err.message };
  }
  return { status: 500, error: String(err) };
}
