import type {
  CreateMessageParams,
  CreateMessageResult,
  LlmClient,
  ToolResultBlock,
} from "./types.ts";

// A scripted stand-in for Claude, for demos without an API key (LLM_MODE=mock).
// Turn 1: ask for the scan. Turn 2: turn whatever the scan found into a report.
export class MockLlm implements LlmClient {
  model = "mock";

  async createMessage({
    messages,
    tools,
  }: CreateMessageParams): Promise<CreateMessageResult> {
    const canScan = tools.some((t) => t.name === "run_accessibility_scan");
    const last = messages[messages.length - 1];
    const lastResults = Array.isArray(last.content)
      ? (last.content as ToolResultBlock[])
      : [];
    const usage = { inputTokens: 0, outputTokens: 0 };

    if (canScan && lastResults.length === 0) {
      return {
        stopReason: "tool_use",
        usage,
        content: [
          {
            type: "tool_use",
            id: "mock_scan",
            name: "run_accessibility_scan",
            input: {},
          },
        ],
      };
    }

    let violations: Array<{
      ruleId: string;
      impact: string | null;
      description: string;
      wcagTags: string[];
      examples: string[];
    }> = [];
    try {
      violations = JSON.parse(lastResults[0]?.content ?? "[]");
    } catch {
      violations = [];
    }

    const severity = (i: string | null) =>
      (["critical", "serious", "moderate", "minor"].includes(i ?? "")
        ? i
        : "moderate") as "critical" | "serious" | "moderate" | "minor";

    return {
      stopReason: "tool_use",
      usage,
      content: [
        {
          type: "tool_use",
          id: "mock_report",
          name: "submit_report",
          input: {
            summary: `Mock mode: ${violations.length} automated issue(s). Set ANTHROPIC_API_KEY for a full AI review.`,
            findings: violations.slice(0, 30).map((v) => ({
              title: v.description,
              severity: severity(v.impact),
              wcag: v.wcagTags
                .map((t) => t.replace(/^wcag(\d)(\d)(\d{1,2})$/, "$1.$2.$3"))
                .filter((t) => /^\d\.\d\.\d{1,2}$/.test(t))
                .slice(0, 5),
              source: "automated",
              element: (v.examples[0] ?? "").slice(0, 500),
              explanation:
                "Found by the automated scanner. Mock mode doesn't explain impact.",
              fix: "Mock mode doesn't suggest fixes.",
            })),
          },
        },
      ],
    };
  }
}
