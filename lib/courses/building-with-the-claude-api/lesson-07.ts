// LESSON 7 SETTINGS: Response streaming
import type Anthropic from "@anthropic-ai/sdk";

// What /api/building-with-the-claude-api/stream sends the browser.
export type StreamRelayEvent =
  | { type: "event"; ms: number; event: Anthropic.MessageStreamEvent }
  | { type: "final"; ms: number; message: Anthropic.Message }
  | { type: "error"; error: string };
export const LESSON_7_PROMPT = "Write a 1 sentence description of a fake database";
export const LONGER_PROMPT = "Write a 300 word short story about a database that becomes self-aware.";

// The six event types, in the order they arrive. Python names them RawMessageStartEvent etc.;
// on the wire (and in TypeScript) the type field is snake_case.
export const EVENT_TYPES = [
  { type: "message_start", python: "MessageStart", what: "A new message is being sent" },
  { type: "content_block_start", python: "ContentBlockStart", what: "A block (text, tool use...) starts" },
  { type: "content_block_delta", python: "ContentBlockDelta", what: "A chunk of generated text" },
  { type: "content_block_stop", python: "ContentBlockStop", what: "The block is complete" },
  { type: "message_delta", python: "MessageDelta", what: "The message is complete: stop_reason and usage" },
  { type: "message_stop", python: "MessageStop", what: "End of the message" },
];
