import { z } from "zod";
import {
  AgentReport,
  type AuditRequest,
  type ToolStep,
} from "@accesslens/shared";
import type {
  LlmClient,
  Message,
  ToolResultBlock,
  ToolUseBlock,
} from "../llm/types.ts";
import type { Scanner } from "../scanner/types.ts";
import { toolsFor } from "./tools.ts";

export class AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentError";
  }
}

const SYSTEM_PROMPT = `You are AccessLens, an accessibility auditor. You review web pages and React Native components against WCAG 2.2 level AA.

How to work:
1. If a scan tool is available, run it first. Treat its results as facts.
2. Then read the code yourself for problems the scanner can't catch: colour contrast in CSS, unclear labels or link text, missing error messages, touch target size, and anything in React Native code.
3. Use search_wcag to confirm the right criterion before you report a problem.
4. Finish by calling submit_report exactly once.

Rules for findings:
- Only report problems you can point to in the submitted code. Never invent elements.
- source is "automated" if the scanner found it, otherwise "ai-review".
- explanation says who is affected (e.g. screen reader users, keyboard users) in one or two plain sentences.
- fix is corrected code the developer can paste in.
- Combine repeats of the same problem into one finding.
- If there are no real problems, submit an empty findings list and say so in the summary.`;

const MAX_CODE_CHARS = 30_000; // keep the prompt within a sensible token budget

function firstMessage(req: AuditRequest, html?: string): string {
  if (req.kind === "react-native") {
    return `Audit this React Native component. There is no scanner for native code, so review it yourself.\n\n<component>\n${req.code.slice(0, MAX_CODE_CHARS)}\n</component>`;
  }
  const source = req.kind === "url" ? `the page at ${req.url}` : "this HTML";
  return `Audit ${source}.\n\n<html_source>\n${(html ?? "").slice(0, MAX_CODE_CHARS)}\n</html_source>`;
}

export type AgentDeps = { llm: LlmClient; scanner: Scanner };
export type AgentOptions = { maxTurns?: number; maxTokens?: number };
export type AgentResult = AgentReport & { steps: ToolStep[] };

// The agent loop: ask the model, run any tools it asks for, send results back, repeat
// until it submits a valid report or we hit the turn limit.
export async function runAgent(
  req: AuditRequest,
  deps: AgentDeps,
  opts: AgentOptions & { html?: string } = {},
): Promise<AgentResult> {
  const maxTurns = opts.maxTurns ?? 8;
  const { runnable, definitions } = toolsFor(req.kind !== "react-native");
  const ctx = { html: opts.html, scanner: deps.scanner };

  const messages: Message[] = [
    { role: "user", content: firstMessage(req, opts.html) },
  ];
  const steps: ToolStep[] = [];

  for (let turn = 1; turn <= maxTurns; turn++) {
    const response = await deps.llm.createMessage({
      system: SYSTEM_PROMPT,
      messages,
      tools: definitions,
      maxTokens: opts.maxTokens ?? 8_000,
    });
    messages.push({ role: "assistant", content: response.content });

    const toolCalls = response.content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use",
    );
    if (toolCalls.length === 0) {
      // The model answered in prose instead of using a tool. Nudge it once per turn.
      messages.push({
        role: "user",
        content: "Please finish by calling submit_report.",
      });
      continue;
    }

    const results: ToolResultBlock[] = [];
    for (const call of toolCalls) {
      if (call.name === "submit_report") {
        const parsed = AgentReport.safeParse(call.input);
        steps.push({
          tool: call.name,
          input: { findings: "…" },
          ok: parsed.success,
        });
        if (parsed.success) return { ...parsed.data, steps };
        // Don't crash on a bad report: tell the model exactly what was wrong and let it retry.
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          is_error: true,
          content: `Report rejected. Fix these problems and call submit_report again:\n${z.prettifyError(parsed.error)}`,
        });
        continue;
      }

      const tool = runnable.get(call.name);
      try {
        if (!tool) throw new Error(`Unknown tool "${call.name}".`);
        const output = await tool.run(call.input, ctx);
        steps.push({ tool: call.name, input: call.input, ok: true });
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: output,
        });
      } catch (err) {
        steps.push({ tool: call.name, input: call.input, ok: false });
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          is_error: true,
          content: err instanceof Error ? err.message : "Tool failed.",
        });
      }
    }
    // Every tool_use must get a tool_result in the very next user message.
    messages.push({ role: "user", content: results });
  }

  throw new AgentError(`The agent didn't finish within ${maxTurns} turns.`);
}
