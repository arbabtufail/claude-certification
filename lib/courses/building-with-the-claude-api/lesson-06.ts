// LESSON 6 SETTINGS: Temperature

// The lesson's next-token example for the prompt "What do you think?".
export const NEXT_TOKENS = [
  { token: "about", p: 0.3 },
  { token: "would", p: 0.2 },
  { token: "of", p: 0.1 },
  { token: "is", p: 0.1 },
  { token: "when", p: 0.1 },
  { token: "makes", p: 0.05 },
  { token: "we", p: 0.05 },
  { token: "(others)", p: 0.1 }, // the lesson's seven tokens add up to 90%; every other word shares the rest
];

// Temperature reshapes the probabilities: p^(1/T), then rescale so they add up to 1.
// T near 0 gives everything to the top token; T = 1 leaves the model's own probabilities.
// (An illustration of the idea; the model's internal sampler isn't exposed.)
export function applyTemperature(probs: number[], t: number): number[] {
  if (t <= 0.001) {
    const max = Math.max(...probs);
    return probs.map((p) => (p === max ? 1 : 0));
  }
  const scaled = probs.map((p) => Math.pow(p, 1 / t));
  const sum = scaled.reduce((a, b) => a + b, 0);
  return scaled.map((p) => p / sum);
}

export const MOVIE_PROMPT = "Generate a one sentence movie idea";

export const TEMPERATURE_RANGES = [
  { range: "0.0 - 0.3", label: "Low", uses: "Factual responses, coding help, data extraction, content moderation" },
  { range: "0.4 - 0.7", label: "Medium", uses: "Summaries, educational content, problem-solving, constrained creative writing" },
  { range: "0.8 - 1.0", label: "High", uses: "Brainstorming, creative writing, marketing content, jokes" },
];
