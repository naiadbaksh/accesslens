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
  element: z
    .string()
    .max(500)
    .describe("The offending markup or code, shortended."),
  explanation: z
    .string()
    .min(1)
    .max(1_000)
    .describe("Who is affected and why in plain language."),
  fix: z.string().min(1).max(1_000).describe("Corrected code."),
});

export type Finding = z.infer<typeof Finding>;

export const AgentReport = z.object({
  summary: z.string().min(1).max(1_000),
  findings: z.array(Finding).max(30),
});

export type AgentReport = z.infer<typeof AgentReport>;

// What the API returns

export const ToolStep = z.object({
  tool: z.string(),
  input: z.unknown(),
  ok: z.boolean(),
});

export type ToolStep = z.infer<typeof ToolStep>;

export type AuditResponse = AgentReport & {
  steps: ToolStep[];
  model: string;
  durationMs: number;
};
