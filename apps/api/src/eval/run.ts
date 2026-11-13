import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { AuditResponse } from "@accesslens/shared";
import { createAudit, type AuditDeps } from "../audits.ts";
import { PROMPT_VERSION } from "../agent/agent.ts";
import { FIXTURES, type Fixture } from "./fixtures.ts";
import { scoreFixture, summarise, type FixtureScore } from "./score.ts";

// Runs every fixture through the real audit flow (same code path as the API) and scores it.
// Usage:  npm run eval              all fixtures
//         npm run eval -- low       only fixtures whose name contains "low"

export async function runEval(deps: AuditDeps, fixtures: Fixture[] = FIXTURES) {
  const scores: FixtureScore[] = [];
  const failures: Array<{ name: string; error: unknown }> = [];
  // One at a time: gentler on rate limits, and the timings mean something.
  for (const fx of fixtures) {
    const res = await createAudit(fx.request, deps);
    if (res.status !== 200) {
      failures.push({ name: fx.name, error: res.body });
      continue;
    }
    const body = res.body as AuditResponse;
    scores.push(scoreFixture(fx.name, fx.expected, body.findings));
  }
  return { scores, failures, total: summarise(scores) };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

async function main() {
  await import("dotenv/config");
  const { config } = await import("../config.ts");
  const { AnthropicClient } = await import("../llm/anthropic.ts");
  const { MockLlm } = await import("../llm/mock.ts");
  const { AxeScanner } = await import("../scanner/axeScanner.ts");
  const { fetchPage } = await import("../scanner/fetchPage.ts");

  const llm =
    config.LLM_MODE === "mock"
      ? new MockLlm()
      : new AnthropicClient(config.ANTHROPIC_API_KEY!, config.ANTHROPIC_MODEL);
  const filter = process.argv[2] ?? "";
  const fixtures = FIXTURES.filter((f) => f.name.includes(filter));

  console.log(
    `Evaluating ${fixtures.length} fixture(s) with ${llm.model}, prompt ${PROMPT_VERSION}\n`,
  );
  const started = Date.now();
  const result = await runEval(
    { llm, scanner: new AxeScanner(), fetchPage },
    fixtures,
  );

  console.table(
    result.scores.map((s) => ({
      fixture: s.name,
      planted: s.expected,
      reported: s.found,
      matched: s.matched,
      "for review": s.flaggedForReview,
      unverified: s.unverified,
    })),
  );
  for (const s of result.scores) {
    for (const m of s.missed) console.log(`  MISSED  ${s.name}: ${m.label}`);
    for (const x of s.extra)
      console.log(`  EXTRA   ${s.name}: ${x.title} [${x.wcag.join(", ")}]`);
  }
  for (const f of result.failures)
    console.log(`  FAILED  ${f.name}: ${JSON.stringify(f.error)}`);

  const t = result.total;
  console.log(
    `\nPrecision ${pct(t.precision)} (${t.matched}/${t.found})   Recall ${pct(t.recall)} (${t.matched}/${t.expected})`,
  );
  console.log(
    "Extras aren't always wrong: read them. A real problem we didn't plant belongs in the answer key.",
  );

  // Keep every run so you can compare models and prompt versions over time.
  await mkdir("eval-results", { recursive: true });
  const file = `eval-results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(
    file,
    JSON.stringify(
      {
        model: llm.model,
        promptVersion: PROMPT_VERSION,
        durationMs: Date.now() - started,
        ...result,
      },
      null,
      2,
    ),
  );
  console.log(`Saved ${file}`);
  if (result.failures.length) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
