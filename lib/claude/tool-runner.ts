// THE TOOL RUNNER (server only, beta)
// Lesson 5: client.beta.messages.toolRunner() runs the same agent loop for you:
// no while loop, no stop_reason switch, no pushing tool results back by hand.
// This wrapper only watches the runner so the page can show each step; the runner does the work.
import type Anthropic from "@anthropic-ai/sdk";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { client } from "./client";
import { estimateCostUsd } from "./models";
import type { AgentEvent, AgentTotals, ToolCall } from "./agent-loop";

type StopReason = Anthropic.Message["stop_reason"];

export type ToolRunnerInput = {
  model: string;
  maxTokens: number;
  tools: BetaRunnableTool[];
  prompt: string;
  maxIterations: number;
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
};

export async function runWithToolRunner(input: ToolRunnerInput): Promise<void> {
  const { model, maxTokens, tools, prompt, maxIterations, signal, onEvent } = input;
  const totals: AgentTotals = { apiCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, ms: 0 };
  const started = performance.now();
  let turn = 0;
  let lastStep = started; // when the last API call or tool finished, to time the next API call

  // Wrap each tool's run() so we can report when the runner executes it. Behaviour is unchanged:
  // the runner still validates the input with the tool's schema and turns a thrown error into is_error.
  const watched = tools.map(
    (tool): BetaRunnableTool => ({
      ...tool,
      run: async (args, context) => {
        const t = performance.now();
        const call: ToolCall = { id: context?.toolUse.id ?? "", name: tool.name, input: args as Record<string, unknown> };
        const report = (output: string, isError: boolean) => {
          totals.toolCalls++;
          lastStep = performance.now();
          onEvent({ type: "tool_result", turn, call, output, isError, ms: Math.round(lastStep - t) });
        };
        try {
          const result = await tool.run(args, context);
          report(typeof result === "string" ? result : JSON.stringify(result), false);
          return result;
        } catch (err) {
          report(err instanceof Error ? err.message : String(err), true);
          throw err;
        }
      },
    }),
  );

  const runner = client.beta.messages.toolRunner(
    {
      model,
      max_tokens: maxTokens,
      tools: watched,
      messages: [{ role: "user", content: prompt }],
      max_iterations: maxIterations,
    },
    { signal },
  );

  // Each iteration yields one complete assistant message. After the loop body, the runner
  // executes any requested tools and calls Claude again on its own.
  for await (const message of runner) {
    turn++;
    const { input_tokens, output_tokens } = message.usage;
    const cost = estimateCostUsd(model, input_tokens, output_tokens);
    totals.apiCalls++;
    totals.inputTokens += input_tokens;
    totals.outputTokens += output_tokens;
    totals.costUsd += cost;

    const toolCalls: ToolCall[] = message.content
      .filter((b) => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }));

    onEvent({
      type: "response",
      turn,
      stopReason: message.stop_reason as StopReason,
      blockTypes: message.content.map((b) => b.type),
      thinking: message.content
        .filter((b): b is Anthropic.Beta.Messages.BetaThinkingBlock => b.type === "thinking")
        .map((b) => b.thinking)
        .filter(Boolean)
        .join("\n\n"),
      text: textOf(message.content),
      toolCalls,
      inputTokens: input_tokens,
      outputTokens: output_tokens,
      costUsd: cost,
      ms: Math.round(performance.now() - lastStep),
    });
    lastStep = performance.now();
  }

  // Awaiting the runner (or calling .done()) gives the final assistant message.
  const final = await runner.done();
  totals.ms = Math.round(performance.now() - started);
  onEvent({
    type: "done",
    reason: final.stop_reason === "tool_use" ? "max_turns" : (final.stop_reason as StopReason),
    finalText: textOf(final.content),
    totals,
    messages: runner.params.messages as Anthropic.MessageParam[], // the runner kept the full history for us
  });
}

function textOf(content: Anthropic.Beta.Messages.BetaContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
