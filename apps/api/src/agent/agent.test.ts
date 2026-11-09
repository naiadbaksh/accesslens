import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runAgent, AgentError } from "./agent.ts";
import type {
  CreateMessageParams,
  CreateMessageResult,
  LlmClient,
} from "../llm/types.ts";
import type { Scanner, Violation } from "../scanner/types.ts";

// A fake model that replays a script of responses and records what it was sent.
class ScriptedLlm implements LlmClient {
  model = "scripted";
  calls: CreateMessageParams[] = [];
  constructor(private script: CreateMessageResult["content"][]) {}
  async createMessage(
    params: CreateMessageParams,
  ): Promise<CreateMessageResult> {
    this.calls.push(structuredClone(params));
    const content = this.script.shift();
    if (!content) throw new Error("Script ran out");
    return {
      content,
      stopReason: "tool_use",
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

const violation: Violation = {
  ruleId: "image-alt",
  impact: "critical",
  description: "Images must have alternate text",
  wcagTags: ["wcag111"],
  helpUrl: "https://example.com",
  examples: ['<img src="logo.png">'],
  count: 1,
};
const fakeScanner = (found: Violation[] = [violation]): Scanner => ({
  scan: async () => found,
});

const goodReport = {
  summary: "One critical issue.",
  findings: [
    {
      title: "Logo has no alt text",
      severity: "critical",
      wcag: ["1.1.1"],
      source: "automated",
      element: '<img src="logo.png">',
      explanation: "Screen reader users hear nothing.",
      fix: '<img src="logo.png" alt="Globalfaces">',
    },
  ],
};

describe("runAgent", () => {
  it("runs the scan, then returns a valid report", async () => {
    const llm = new ScriptedLlm([
      [
        {
          type: "tool_use",
          id: "t1",
          name: "run_accessibility_scan",
          input: {},
        },
      ],
      [
        {
          type: "tool_use",
          id: "t2",
          name: "submit_report",
          input: goodReport,
        },
      ],
    ]);
    const result = await runAgent(
      { kind: "html", html: "<img src=logo.png>" },
      { llm, scanner: fakeScanner() },
      { html: "<img src=logo.png>" },
    );

    assert.equal(result.findings.length, 1);
    assert.deepEqual(
      result.steps.map((s) => s.tool),
      ["run_accessibility_scan", "submit_report"],
    );

    // The scan output was sent back to the model as a tool_result for the right call.
    const secondCall = llm.calls[1].messages.at(-1)!;
    assert.ok(Array.isArray(secondCall.content));
    const toolResult = (
      secondCall.content as Array<{ tool_use_id: string; content: string }>
    )[0];
    assert.equal(toolResult.tool_use_id, "t1");
    assert.match(toolResult.content, /image-alt/);
  });

  it("sends validation errors back and accepts a corrected report", async () => {
    const llm = new ScriptedLlm([
      [
        {
          type: "tool_use",
          id: "t1",
          name: "submit_report",
          input: { summary: "", findings: "nope" },
        },
      ],
      [
        {
          type: "tool_use",
          id: "t2",
          name: "submit_report",
          input: goodReport,
        },
      ],
    ]);
    const result = await runAgent(
      { kind: "react-native", code: "<Image source={logo} />" },
      { llm, scanner: fakeScanner() },
    );

    assert.equal(result.summary, "One critical issue.");
    const feedback = llm.calls[1].messages.at(-1)!.content as Array<{
      is_error?: boolean;
      content: string;
    }>;
    assert.equal(feedback[0].is_error, true);
    assert.match(feedback[0].content, /Report rejected/);
  });

  it("doesn't offer the scanner for React Native code", async () => {
    const llm = new ScriptedLlm([
      [
        {
          type: "tool_use",
          id: "t1",
          name: "submit_report",
          input: goodReport,
        },
      ],
    ]);
    await runAgent(
      { kind: "react-native", code: "<View />" },
      { llm, scanner: fakeScanner() },
    );
    const toolNames = llm.calls[0].tools.map((t) => t.name);
    assert.deepEqual(toolNames, ["search_wcag", "submit_report"]);
  });

  it("reports unknown tools to the model instead of crashing", async () => {
    const llm = new ScriptedLlm([
      [{ type: "tool_use", id: "t1", name: "delete_everything", input: {} }],
      [
        {
          type: "tool_use",
          id: "t2",
          name: "submit_report",
          input: goodReport,
        },
      ],
    ]);
    const result = await runAgent(
      { kind: "html", html: "<p>hi</p>" },
      { llm, scanner: fakeScanner() },
      { html: "<p>hi</p>" },
    );
    assert.equal(result.steps[0].ok, false);
  });

  it("gives up after the turn limit", async () => {
    const forever = Array.from({ length: 5 }, (_, i) => [
      {
        type: "tool_use" as const,
        id: `t${i}`,
        name: "search_wcag",
        input: { query: "alt" },
      },
    ]);
    const llm = new ScriptedLlm(forever);
    await assert.rejects(
      runAgent(
        { kind: "html", html: "<p>hi</p>" },
        { llm, scanner: fakeScanner() },
        { html: "<p>hi</p>", maxTurns: 3 },
      ),
      AgentError,
    );
    assert.equal(llm.calls.length, 3);
  });
});
