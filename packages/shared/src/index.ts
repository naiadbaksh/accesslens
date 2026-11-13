import { z } from "zod";

// What the client sends

export const AuditRequest = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("html"),
      html: z.string().trim().min(1, "Paste some HTML").max(200_000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("url"),
      url: z.url({ protocol: /^https?$/ }).max(2_000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("react-native"),
      code: z.string().trim().min(1, "Paste a component").max(50_000),
    })
    .strict(),
]);

export type AuditRequest = z.infer<typeof AuditRequest>;

// What the agent must return

export const Severity = z.enum(["critical", "serious", "moderate", "minor"]);
export type Severity = z.infer<typeof Severity>;

// Who a problem gets in the way of. Grouping by people, not by rule ID, is how
// a product team decides what to fix first.
export const AffectedGroup = z.enum([
  "screen-reader",
  "keyboard",
  "low-vision",
  "colour-blind",
  "cognitive",
  "motor",
  "deaf-hard-of-hearing",
]);
export type AffectedGroup = z.infer<typeof AffectedGroup>;

export const AFFECTED_LABELS: Record<AffectedGroup, string> = {
  "screen-reader": "Screen reader users",
  keyboard: "Keyboard users",
  "low-vision": "Low vision",
  "colour-blind": "Colour blind",
  cognitive: "Cognitive and learning",
  motor: "Motor and dexterity",
  "deaf-hard-of-hearing": "Deaf and hard of hearing",
};

export const Confidence = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof Confidence>;

export const Finding = z.object({
  title: z.string().min(1).max(200),
  severity: Severity,
  wcag: z
    .array(z.string().regex(/^\d\.\d{1,2}\.\d{1,2}$/))
    .max(5)
    .describe('WCAG success criteria, e.g. ["1.1.1"]'),
  source: z
    .enum(["automated", "ai-review"])
    .describe(
      "automated = found by the scanner; ai-review = found by reading the code",
    ),
  affects: z
    .array(AffectedGroup)
    .min(1)
    .max(4)
    .describe("The groups of people this problem gets in the way of."),
  confidence: Confidence.describe(
    "high = the scanner confirmed it or the code is unambiguous; medium = inferred from the code; low = depends on how the page renders or behaves",
  ),
  needsHumanReview: z
    .boolean()
    .describe(
      "true when judging this needs a person: alt text quality, whether wording makes sense, contrast worked out from CSS, reading or focus order, anything about how it looks or sounds",
    ),
  element: z
    .string()
    .max(500)
    .describe(
      "The offending markup or code, copied exactly from the source. Shorten with … if long.",
    ),
  explanation: z
    .string()
    .min(1)
    .max(1_000)
    .describe("Who is affected and why, in plain language."),
  fix: z.string().min(1).max(1_000).describe("Corrected code."),
});

export type Finding = z.infer<typeof Finding>;

export const AgentReport = z.object({
  summary: z.string().min(1).max(1_000),
  findings: z.array(Finding).max(30),
});

export type AgentReport = z.infer<typeof AgentReport>;

// What the API adds after the agent finishes

// The server checks every finding's `element` against the code that was audited.
// verified = we found it; not-found = we couldn't, so treat the finding with suspicion.
export const Evidence = z.enum(["verified", "not-found"]);
export type Evidence = z.infer<typeof Evidence>;

export type CheckedFinding = Finding & { evidence: Evidence };

export const ToolStep = z.object({
  tool: z.string(),
  input: z.unknown(),
  ok: z.boolean(),
});

export type ToolStep = z.infer<typeof ToolStep>;

export type AuditResponse = {
  summary: string;
  findings: CheckedFinding[];
  steps: ToolStep[];
  model: string;
  promptVersion: string;
  durationMs: number;
};
