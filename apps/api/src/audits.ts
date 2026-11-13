import { AuditRequest, type AuditResponse } from "@accesslens/shared";
import {
  AgentError,
  PROMPT_VERSION,
  runAgent,
  type AgentDeps,
} from "./agent/agent.ts";
import { checkFindings } from "./agent/evidence.ts";
import { FetchPageError } from "./scanner/fetchPage.ts";
import { HttpError } from "./http/retry.ts";

export type AuditDeps = AgentDeps & {
  fetchPage: (url: string) => Promise<string>;
};
export type HandlerResult = { status: number; body: unknown };

// The whole "create an audit" use case, with no Express in sight.
// The route is a thin adapter around this, which keeps it easy to test.
export async function createAudit(
  body: unknown,
  deps: AuditDeps,
): Promise<HandlerResult> {
  // 1. Never trust the client: validate the shape before doing anything.
  const parsed = AuditRequest.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "invalid_request",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    };
  }
  const req = parsed.data;
  const started = Date.now();

  try {
    // 2. Get the HTML to audit.
    const html =
      req.kind === "html"
        ? req.html
        : req.kind === "url"
          ? await deps.fetchPage(req.url)
          : undefined;

    // 3. Let the agent investigate and report.
    const report = await runAgent(req, deps, { html });

    // 4. Check the agent's work against the code it was given, instead of trusting it.
    const source = req.kind === "react-native" ? req.code : (html ?? "");
    const response: AuditResponse = {
      summary: report.summary,
      findings: checkFindings(report.findings, source),
      steps: report.steps,
      model: deps.llm.model,
      promptVersion: PROMPT_VERSION,
      durationMs: Date.now() - started,
    };
    return { status: 200, body: response };
  } catch (err) {
    // 5. Turn known failures into clear messages. Anything else is a 500, logged by the caller.
    if (err instanceof FetchPageError)
      return {
        status: err.status,
        body: { error: "fetch_failed", message: err.message },
      };
    if (err instanceof AgentError)
      return {
        status: 502,
        body: { error: "agent_failed", message: err.message },
      };
    if (
      err instanceof HttpError ||
      (err instanceof Error && err.name === "TimeoutError")
    ) {
      return {
        status: 503,
        body: {
          error: "ai_unavailable",
          message: "The AI service is busy. Please try again shortly.",
        },
      };
    }
    throw err;
  }
}
