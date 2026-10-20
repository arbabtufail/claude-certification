// WHAT THE COURSE TUTOR KNOWS (server only; goes into the tutor's system prompt)
// One entry per lesson: the key points, and how this app does it in TypeScript.
// Add an entry when you add a lesson.

export const LESSON_NOTES: Record<string, string> = {
  "02-getting-an-api-key": `Lesson 2, Getting an API key. Create a key in the Claude Console. In this app it lives in
.env.local as ANTHROPIC_API_KEY (git-ignored). Never put a key in code or send it to the browser.`,

  "03-making-a-request": `Lesson 3, Making a request. client.messages.create needs model, max_tokens and messages.
max_tokens is a safety cap, not a target: Claude writes what it needs and is cut off (stop_reason "max_tokens")
if it hits the cap. Each message has a role ("user" or "assistant") and content. Python reads
message.content[0].text; in TypeScript content is a union of block types, so check block.type === "text" first.
On newer models content[0] can be a thinking block.
TS setup: npm install @anthropic-ai/sdk; new Anthropic() reads ANTHROPIC_API_KEY; node --env-file=.env.local
replaces python-dotenv.`,

  "04-multi-turn-conversations": `Lesson 4, Multi-turn conversations. Claude stores no conversation history; every
request is independent. To hold a conversation, keep a messages list in your code and send ALL of it each time:
user message -> Claude's reply appended as an assistant message -> follow-up user message -> send the whole list.
Helpers: addUserMessage(messages, text), addAssistantMessage(messages, text), chat(messages).
Without the history, "Write another sentence" gets a random sentence.`,

  "05-system-prompts": `Lesson 5, System prompts. A system prompt shapes tone, style and role, and keeps Claude on task.
Pass it as the top-level system parameter (not as a message). Example: a patient math tutor that gives hints and
guiding questions instead of the answer. The API rejects system: null, so only add the field when there is one:
if (system) params.system = system.`,

  "06-temperature": `Lesson 6, Temperature. Claude generates text by tokenizing, predicting next-token probabilities,
and sampling. Temperature (0 to 1) reshapes those probabilities: near 0 almost always picks the top token
(deterministic), near 1 spreads the choice (varied, creative). Low 0-0.3: facts, code, extraction, moderation.
Medium 0.4-0.7: summaries, teaching, problem-solving. High 0.8-1: brainstorming, creative writing, jokes.
It changes the odds, it doesn't guarantee different output.
IMPORTANT, current API: only claude-sonnet-4-5 and claude-haiku-4-5 accept a temperature other than 1. Newer
models (Opus 5.5, Opus 5, Sonnet 5.5, Sonnet 5, Haiku 5.5) return 400 "temperature is deprecated for this model";
on them, steer with the prompt and the effort setting instead.`,

  "07-response-streaming": `Lesson 7, Response streaming. Responses can take 10-30s; streaming shows text as it's
generated. Events, in order: message_start, content_block_start, content_block_delta (the text chunks),
content_block_stop, message_delta (stop_reason, usage), message_stop.
TypeScript: client.messages.create({ ..., stream: true }) returns raw events to iterate with for await;
client.messages.stream({...}) is the helper: stream.on("text", (delta) => ...) for text only, and
await stream.finalMessage() for the assembled message to store. Python's text_stream / get_final_message map to these.`,

  "08-structured-data": `Lesson 8, Structured data. To get only raw JSON (no markdown fence, no commentary), the lesson
prefills the assistant turn with "\`\`\`json" and sets stop_sequences: ["\`\`\`"], then JSON.parse(text.trim()).
Works for code, CSV, lists too: prefill what Claude would open with, stop on what it would close with.
IMPORTANT, current API: assistant prefill only works on claude-sonnet-4-5 and claude-haiku-4-5. Newer models
return 400 "does not support assistant message prefill". The replacement is structured outputs:
client.messages.parse({ ..., output_config: { format: zodOutputFormat(schema) } }) and read
response.parsed_output. Stop sequences alone still work on every model.`,
};
