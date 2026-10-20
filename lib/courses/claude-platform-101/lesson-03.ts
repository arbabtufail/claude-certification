// LESSON 3 SETTINGS: Choosing the right model

// Part 1: compare tiers side by side. Same prompt, same max_tokens, only the model changes.
export const COMPARE_DEFAULT_MODELS = ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-5-5"];
export const COMPARE_DEFAULT_MAX_TOKENS = 300;
export const COMPARE_DEFAULT_PROMPT = "Define 'API rate limiting' in two sentences.";

// Part 2: route different work to different models inside one endpoint.
// Every document is classified with Haiku, then sent to the model that fits the job.
export type DocCategory = "client_update" | "rfp" | "other";

export const ROUTER_CLASSIFIER = {
  model: "claude-haiku-4-5",
  maxTokens: 20,
  system:
    "You classify incoming business documents. Reply with exactly one label and nothing else:\n" +
    "client_update - a client asking about or reporting on project status\n" +
    "rfp - a request for proposal or tender asking us to bid\n" +
    "other - anything else",
};

export const ROUTES: Record<DocCategory, { model: string; maxTokens: number; system: string } | null> = {
  client_update: {
    model: "claude-sonnet-5",
    maxTokens: 1024,
    system: "You are an account manager. Draft a short, friendly, professional reply to this client update.",
  },
  rfp: {
    model: "claude-opus-5-5",
    maxTokens: 4096,
    system:
      "You are a senior bid writer. Draft a structured RFP response outline: understanding of requirements, " +
      "proposed approach, risks and assumptions, and open questions for the client. Keep it under 500 words.",
  },
  other: null, // classified only, no drafting step
};

export function parseCategory(text: string): DocCategory {
  const label = text.trim().toLowerCase();
  if (label.includes("client_update")) return "client_update";
  if (label.includes("rfp")) return "rfp";
  return "other";
}

export const ROUTER_SAMPLES: { label: string; text: string }[] = [
  {
    label: "Client update",
    text:
      "Hi team, quick check-in from Northwind. We saw the staging build last week and it looks great. " +
      "Can you confirm we're still on track for the 15th go-live, and whether the SSO work made it in?\n\nThanks, Maria",
  },
  {
    label: "RFP",
    text:
      "REQUEST FOR PROPOSAL: City of Brookfield seeks a vendor to build and host a resident services portal " +
      "(permits, bill payment, service requests). Must integrate with our Oracle billing system, meet WCAG 2.2 AA, " +
      "and support 50,000 monthly users. Proposals due November 30. Include timeline, staffing, and a fixed-price quote.",
  },
  {
    label: "Other",
    text: "Reminder: the office kitchen will be closed Friday for cleaning. Please take your lunch containers home by Thursday.",
  },
];
