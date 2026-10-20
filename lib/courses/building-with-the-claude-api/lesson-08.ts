// LESSON 8 SETTINGS: Structured data
// The lesson's trick: prefill the assistant turn with what Claude would naturally open with ("```json"),
// and stop when it tries to close it ("```"). What's left is just the content.

export type Lesson8Preset = {
  id: "eventbridge" | "python" | "csv";
  label: string;
  prompt: string;
  prefill: string;
  stop: string;
  parse: "json" | "none";
};

export const PRESETS: Lesson8Preset[] = [
  {
    id: "eventbridge",
    label: "EventBridge rule (JSON)",
    prompt: "Generate a very short event bridge rule as json",
    prefill: "```json",
    stop: "```",
    parse: "json",
  },
  {
    id: "python",
    label: "Python snippet",
    prompt: "Write a Python function that checks whether a string is a palindrome",
    prefill: "```python",
    stop: "```",
    parse: "none",
  },
  {
    id: "csv",
    label: "CSV data",
    prompt: "Generate CSV data for 5 fictional employees with columns name, role, start_year",
    prefill: "```csv",
    stop: "```",
    parse: "none",
  },
];

export type Lesson8Mode = "plain" | "prefill" | "structured";
