import type { CheckedFinding } from "@accesslens/shared";
import { normalise } from "../agent/evidence.ts";
import type { Expected } from "./fixtures.ts";

export type FixtureScore = {
  name: string;
  expected: number;
  found: number;
  matched: number;
  missed: Expected[]; // planted problems the agent didn't report
  extra: CheckedFinding[]; // findings that matched nothing in the answer key
  flaggedForReview: number;
  unverified: number;
};

function matches(f: CheckedFinding, e: Expected): boolean {
  if (!f.wcag.some((c) => e.wcag.includes(c))) return false;
  return !e.element || normalise(f.element).includes(normalise(e.element));
}

// Pair each planted problem with at most one finding, and each finding with at most one problem,
// so one vague finding can't take credit for several planted problems.
export function scoreFixture(
  name: string,
  expected: Expected[],
  findings: CheckedFinding[],
): FixtureScore {
  const used = new Set<number>();
  const missed: Expected[] = [];
  for (const e of expected) {
    const i = findings.findIndex((f, idx) => !used.has(idx) && matches(f, e));
    if (i === -1) missed.push(e);
    else used.add(i);
  }
  return {
    name,
    expected: expected.length,
    found: findings.length,
    matched: used.size,
    missed,
    extra: findings.filter((_, idx) => !used.has(idx)),
    flaggedForReview: findings.filter((f) => f.needsHumanReview).length,
    unverified: findings.filter((f) => f.evidence === "not-found").length,
  };
}

// Precision: of everything the agent reported, how much was in the answer key?
// Recall: of everything we planted, how much did the agent find?
// Totals are added up across fixtures before dividing, so big fixtures count for more.
export function summarise(scores: FixtureScore[]) {
  const sum = (k: "expected" | "found" | "matched") =>
    scores.reduce((n, s) => n + s[k], 0);
  const expected = sum("expected");
  const found = sum("found");
  const matched = sum("matched");
  return {
    expected,
    found,
    matched,
    precision: found === 0 ? 1 : matched / found,
    recall: expected === 0 ? 1 : matched / expected,
  };
}
