import type { AuditRequest, AuditResponse } from "@accesslens/shared";

export class ApiError extends Error {}

const MESSAGES: Record<string, string> = {
  invalid_request: "Please check what you entered.",
  fetch_failed: "We couldn't load that page.",
  agent_failed: "The audit didn't finish. Please try again.",
  ai_unavailable: "The AI service is busy. Please try again in a minute.",
  too_large: "That's too much code for one audit.",
};

export async function runAudit(req: AuditRequest, signal?: AbortSignal): Promise<AuditResponse> {
  let res: Response;
  try {
    res = await fetch("/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
  } catch {
    throw new ApiError("Can't reach the AccessLens server. Is it running?");
  }

  if (res.status === 429) throw new ApiError("Too many audits in a row. Wait a minute and try again.");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issues = Array.isArray(body.issues) ? ` ${body.issues.map((i: { message: string }) => i.message).join(" ")}` : "";
    throw new ApiError((body.message ?? MESSAGES[body.error] ?? "Something went wrong.") + issues);
  }
  return body as AuditResponse;
}
