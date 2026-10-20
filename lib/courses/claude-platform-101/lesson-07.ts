// LESSON 7 SETTINGS: Built-in tools
// Plain data, safe for the browser.
import type Anthropic from "@anthropic-ai/sdk";

export const LESSON_7_MODEL = "claude-opus-5";
export const LESSON_7_MAX_TOKENS = 1024; // the lesson's value; raise it on the page if an answer gets cut off

// The _20260209 web tools need Opus 4.6+ / Sonnet 4.6+, so Haiku is not offered here.
export const LESSON_7_MODELS = ["claude-opus-5", "claude-opus-5-5", "claude-sonnet-5", "claude-sonnet-5-5"];

export type DemoId = "search" | "code" | "fetch";

export type Demo = {
  id: DemoId;
  label: string;
  what: string;
  // Server tools have no input_schema and no run function: just a type and a name.
  tools: Anthropic.ToolUnion[];
  samples: { label: string; prompt: string }[];
};

export const DEMOS: Record<DemoId, Demo> = {
  search: {
    id: "search",
    label: "Web search",
    what: "Searches the internet and returns results with citations. $10 per 1,000 searches, plus tokens.",
    // max_uses caps how many searches Claude may run for one request.
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
    samples: [
      { label: "Lesson example", prompt: "What is Anthropic's latest model release? Answer in one sentence." },
      {
        label: "Fact-check a claim",
        prompt:
          "Fact-check this sentence and cite your sources: 'The Eiffel Tower is 330 meters tall and was completed in 1887.' " +
          "Say which parts are right and which are wrong.",
      },
      { label: "Something recent", prompt: "What were the top 3 tech news stories this week? One line each." },
    ],
  },
  code: {
    id: "code",
    label: "Code execution",
    what: "Claude writes Python and runs it in Anthropic's sandbox (no internet; numpy, pandas, etc. installed).",
    tools: [{ type: "code_execution_20260120", name: "code_execution" }],
    samples: [
      { label: "Lesson example", prompt: "Calculate the mean and standard deviation of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]" },
      {
        label: "Loan table",
        prompt: "Make a month-by-month table for a $20,000 loan at 7% APR over 12 months: payment, interest, principal, balance.",
      },
      { label: "Check a claim with code", prompt: "Is 2^61 - 1 prime? Verify it by running code, don't just recall it." },
    ],
  },
  fetch: {
    id: "fetch",
    label: "Web fetch",
    what: "Retrieves the full content of a URL. Claude can only fetch URLs that appear in the conversation.",
    tools: [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 3 }],
    samples: [
      { label: "Summarize a page", prompt: "Summarize https://en.wikipedia.org/wiki/Large_language_model in 3 bullet points." },
      {
        label: "Pull facts from a page",
        prompt: "From https://www.anthropic.com/company, what does Anthropic say its mission is? Quote it exactly.",
      },
    ],
  },
};

export function isDemoId(v: unknown): v is DemoId {
  return v === "search" || v === "code" || v === "fetch";
}

// Two versions of web search. Tested on this project: the newer one filtered results with code and returned
// no citation objects; the basic one returned citations and used about half the tokens.
export type SearchVersion = "web_search_20260209" | "web_search_20250305";

export const SEARCH_VERSIONS: Record<SearchVersion, { label: string; help: string }> = {
  web_search_20260209: {
    label: "web_search_20260209 (lesson)",
    help: "Dynamic filtering: Claude runs code on Anthropic's side to filter results before reading them.",
  },
  web_search_20250305: {
    label: "web_search_20250305 (basic)",
    help: "No filtering step. Results go straight to Claude, and the answer carries citation objects.",
  },
};

export function isSearchVersion(v: unknown): v is SearchVersion {
  return v === "web_search_20260209" || v === "web_search_20250305";
}

export function toolsFor(demo: DemoId, searchVersion: SearchVersion = "web_search_20260209"): Anthropic.ToolUnion[] {
  if (demo === "search") return [{ type: searchVersion, name: "web_search", max_uses: 5 }];
  return DEMOS[demo].tools;
}

export const LESSON_7_SNIPPET = `// Call 1: web search. Anthropic runs the search server-side
const searchResponse = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 1024,
  tools: [{ type: "web_search_20260209", name: "web_search" }],
  messages: [{ role: "user", content: "What is Anthropic's latest model release? Answer in one sentence." }],
});

// Call 2: code execution. Claude writes and runs Python in a sandbox
const codeResponse = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 1024,
  tools: [{ type: "code_execution_20260120", name: "code_execution" }],
  messages: [{ role: "user", content: "Calculate the mean and standard deviation of [1, 2, ..., 10]" }],
});

// No agent loop: the response already contains server_tool_use + result blocks + text.`;

// The other category: schemas Anthropic publishes and trains Claude on, but YOUR code runs.
export const CLIENT_TOOLS = [
  {
    type: "memory_20250818",
    name: "memory",
    what: "Claude reads and writes memory files across sessions.",
    whoRuns: "Your code, against storage you provide. Four SDKs ship a helper (TypeScript: betaMemoryTool).",
  },
  {
    type: "bash_20250124",
    name: "bash",
    what: "A persistent bash shell so Claude can run commands.",
    whoRuns: "Your application runs the shell and returns the output as a tool_result.",
  },
];
