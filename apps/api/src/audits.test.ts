import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createAudit, type AuditDeps } from "./audits.ts";
import { MockLlm } from "./llm/mock.ts";
import { FetchPageError } from "./scanner/fetchPage.ts";

const deps = (overrides: Partial<AuditDeps> = {}): AuditDeps => ({
  llm: new MockLlm(),
  scanner: {
    scan: async () => [{
      ruleId: "label", impact: "critical", description: "Form elements must have labels",
      wcagTags: ["wcag412", "wcag131"], helpUrl: "", examples: ['<input name="email">'], count: 1,
    }],
  },
  fetchPage: async () => "<html><body><input name=email></body></html>",
  ...overrides,
});

describe("createAudit", () => {
  it("rejects a request with the wrong shape", async () => {
    const res = await createAudit({ kind: "html", html: "", extra: true }, deps());
    assert.equal(res.status, 400);
    assert.equal((res.body as { error: string }).error, "invalid_request");
  });

  it("rejects non-http URLs", async () => {
    const res = await createAudit({ kind: "url", url: "file:///etc/passwd" }, deps());
    assert.equal(res.status, 400);
  });

  it("audits pasted HTML end to end (mock model)", async () => {
    const res = await createAudit({ kind: "html", html: "<input name=email>" }, deps());
    assert.equal(res.status, 200);
    const body = res.body as { findings: Array<{ wcag: string[] }>; model: string };
    assert.equal(body.model, "mock");
    assert.deepEqual(body.findings[0].wcag, ["4.1.2", "1.3.1"]);
  });

  it("checks the agent's evidence against the submitted code", async () => {
    const res = await createAudit({ kind: "html", html: "<input name=email>" }, deps());
    const body = res.body as { findings: Array<{ evidence: string }>; promptVersion: string };
    assert.equal(body.findings[0].evidence, "verified");
    assert.match(body.promptVersion, /^[0-9a-f]{8}$/);
  });

  it("flags findings that point at code that isn't there", async () => {
    const res = await createAudit(
      { kind: "html", html: "<p>Nothing to see</p>" },
      deps(), // the fake scanner still reports an <input>, which this HTML doesn't contain
    );
    const body = res.body as { findings: Array<{ evidence: string; needsHumanReview: boolean }> };
    assert.equal(body.findings[0].evidence, "not-found");
    assert.equal(body.findings[0].needsHumanReview, true);
  });

  it("fetches the page for URL audits", async () => {
    let fetched = "";
    const res = await createAudit({ kind: "url", url: "https://example.com" },
      deps({ fetchPage: async (u) => { fetched = u; return "<p>ok</p>"; } }));
    assert.equal(res.status, 200);
    assert.equal(fetched, "https://example.com");
  });

  it("turns fetch failures into a clear error", async () => {
    const res = await createAudit({ kind: "url", url: "https://example.com" },
      deps({ fetchPage: async () => { throw new FetchPageError("The page took too long to respond.", 502); } }));
    assert.equal(res.status, 502);
    assert.equal((res.body as { message: string }).message, "The page took too long to respond.");
  });
});
