import { z } from "zod";
import { AgentReport } from "@accesslens/shared";
import { searchWcag } from "../knowledge/wcag.ts";
import type { Scanner } from "../scanner/types.ts";
import type { ToolDefinition } from "../llm/types.ts";

// A tool = a name and description the model reads, a JSON Schema for its input,
// and the code we run when the model calls it. The model never runs code itself:
// it asks, we validate, we run, we send back the result.

export type ToolContext = { html?: string; scanner: Scanner };

type Tool = {
  definition: ToolDefinition;
  run: (input: unknown, ctx: ToolContext) => Promise<string>;
};

const SearchInput = z.object({ query: z.string().min(1).max(200) });

// Zod -> JSON Schema, minus the "$schema" header the model doesn't need.
function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema);
  return rest;
}

export const runScanTool: Tool = {
  definition: {
    name: "run_accessibility_scan",
    description:
      "Run the axe-core accessibility engine on the submitted HTML. Returns rule violations with WCAG tags and example elements. Does not check colour contrast. Call this once, first.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  async run(_input, ctx) {
    if (!ctx.html) return "No HTML was submitted, so there is nothing to scan.";
    const violations = await ctx.scanner.scan(ctx.html);
    if (violations.length === 0)
      return "The automated scan found no violations.";
    return JSON.stringify(violations);
  },
};

export const searchWcagTool: Tool = {
  definition: {
    name: "search_wcag",
    description:
      'Look up WCAG 2.2 success criteria by number (e.g. "1.1.1") or by keywords (e.g. "form label placeholder"). Returns the criterion, what it requires, and common fixes. Use it to confirm which criterion a problem breaks before reporting it.',
    input_schema: jsonSchema(SearchInput),
  },
  async run(input) {
    const { query } = SearchInput.parse(input);
    const hits = searchWcag(query);
    return hits.length
      ? JSON.stringify(hits)
      : `No criteria matched "${query}". Try other keywords.`;
  },
};

// The model "finishes" by calling this tool. Its input schema is generated from the same Zod
// schema we validate with, so the contract the model sees and the check we run can't drift apart.
export const submitReportTool: ToolDefinition = {
  name: "submit_report",
  description:
    "Submit the final accessibility report. Call this exactly once, when you have finished investigating. Order findings from most to least severe.",
  input_schema: jsonSchema(AgentReport),
};

export function toolsFor(hasHtml: boolean) {
  const runnable = hasHtml ? [runScanTool, searchWcagTool] : [searchWcagTool];
  return {
    runnable: new Map(runnable.map((t) => [t.definition.name, t])),
    definitions: [...runnable.map((t) => t.definition), submitReportTool],
  };
}
