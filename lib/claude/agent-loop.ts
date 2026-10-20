// THE AGENT LOOP (server only)
// Lesson 4: send messages with tools -> Claude answers or asks for a tool -> your code runs it
// -> send the result back -> repeat until stop_reason is "end_turn".
// You own the loop and the tools. Claude owns the reasoning.
import type Anthropic from "@anthropic-ai/sdk";
import { client } from "./client";
import { estimateCostUsd } from "./models";
import { extractText, extractThinking, type Effort } from "./send";

// Your code that actually executes a tool. Return a string result, or throw to report an error to Claude.
export type ToolRunner = (name: string, input: Record<string, unknown>) => Promise<string> | string;

export type ToolCall = { id: string; name: string; input: Record<string, unknown> };

export type AgentTotals = {
  apiCalls: number;
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  ms: number;
};

// Every step of the loop is reported as an event, so a UI can show it while it runs.
export type AgentEvent =
  | { type: "request"; turn: number; messageCount: number }
  | {
      type: "response";
      turn: number;
      stopReason: Anthropic.Message["stop_reason"];
      blockTypes: string[];
      thinking?: string; // reasoning summary, when display is "summarized"
      text: string;
      toolCalls: ToolCall[];
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      ms: number;
    }
  | { type: "tool_result"; turn: number; call: ToolCall; output: string; isError: boolean; ms: number }
  | {
      type: "done";
      reason: Anthropic.Message["stop_reason"] | "max_turns";
      finalText: string;
      totals: AgentTotals;
      messages: Anthropic.MessageParam[];
    };

// What the API route streams to the browser: loop events, plus an error if the loop throws.
export type AgentStreamEvent = AgentEvent | { type: "error"; status: number; error: string };

export type AgentLoopInput = {
  model: string;
  maxTokens: number;
  system?: string;
  tools: Anthropic.Tool[];
  runTool: ToolRunner;
  thinking?: Anthropic.ThinkingConfigParam;
  effort?: Effort;
  prompt: string;
  maxTurns: number; // safety cap so a confused agent can't loop (and bill) forever
  signal?: AbortSignal; // stops the loop if the browser disconnects
  onEvent: (event: AgentEvent) => void;
};

export async function runAgentLoop(input: AgentLoopInput): Promise<void> {
  const { model, maxTokens, system, tools, runTool, prompt, maxTurns, signal, onEvent, thinking, effort } = input;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  const totals: AgentTotals = { apiCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, ms: 0 };
  const started = performance.now();
  const finish = (reason: Anthropic.Message["stop_reason"] | "max_turns", finalText: string) => {
    totals.ms = Math.round(performance.now() - started);
    onEvent({ type: "done", reason, finalText, totals, messages });
  };

  for (let turn = 1; turn <= maxTurns; turn++) {
    // 1. Send the whole conversation so far, with the tools Claude may use.
    onEvent({ type: "request", turn, messageCount: messages.length });
    const t0 = performance.now();
    const response = await client.messages.create(
      {
        model,
        max_tokens: maxTokens,
        tools,
        messages,
        ...(system ? { system } : {}),
        ...(thinking ? { thinking } : {}),
        ...(effort ? { output_config: { effort } } : {}),
      },
      { signal },
    );

    const { input_tokens, output_tokens } = response.usage;
    const cost = estimateCostUsd(model, input_tokens, output_tokens);
    totals.apiCalls++;
    totals.inputTokens += input_tokens;
    totals.outputTokens += output_tokens;
    totals.costUsd += cost;

    // 2. Claude answers with a final answer, or with tool_use blocks asking us to run tools.
    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const toolCalls: ToolCall[] = toolUses.map((b) => ({
      id: b.id,
      name: b.name,
      input: b.input as Record<string, unknown>,
    }));
    onEvent({
      type: "response",
      turn,
      stopReason: response.stop_reason,
      blockTypes: response.content.map((b) => b.type),
      thinking: extractThinking(response),
      text: extractText(response),
      toolCalls,
      inputTokens: input_tokens,
      outputTokens: output_tokens,
      costUsd: cost,
      ms: Math.round(performance.now() - t0),
    });

    // Always keep Claude's full reply (including thinking and tool_use blocks) in the history.
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "tool_use") {
      // 3. Run every requested tool. Independent calls run in parallel.
      const results = await Promise.all(
        toolCalls.map(async (call): Promise<Anthropic.ToolResultBlockParam> => {
          const t = performance.now();
          let output: string;
          let isError = false;
          try {
            output = await runTool(call.name, call.input);
          } catch (err) {
            output = err instanceof Error ? err.message : String(err);
            isError = true; // Claude sees the error and can recover
          }
          totals.toolCalls++;
          onEvent({ type: "tool_result", turn, call, output, isError, ms: Math.round(performance.now() - t) });
          return { type: "tool_result", tool_use_id: call.id, content: output, ...(isError ? { is_error: true } : {}) };
        }),
      );

      // 4. Send ALL results back in ONE user message, then loop so Claude can continue.
      messages.push({ role: "user", content: results });
      continue;
    }

    if (response.stop_reason === "pause_turn") continue; // server tool paused; resend to let it resume

    // end_turn (done), max_tokens (cut off), refusal, stop_sequence: the loop ends here.
    return finish(response.stop_reason, extractText(response));
  }

  finish("max_turns", "");
}
