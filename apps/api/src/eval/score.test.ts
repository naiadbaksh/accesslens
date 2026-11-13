import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CheckedFinding } from "@accesslens/shared";
import { scoreFixture, summarise } from "./score.ts";
import { runEval } from "./run.ts";
import { MockLlm } from "../llm/mock.ts";
import type { Expected } from "./fixtures.ts";

const f = (wcag: string[], element: string): CheckedFinding => ({
  title: "t",
  severity: "serious",
  wcag,
  source: "ai-review",
  affects: ["screen-reader"],
  confidence: "medium",
  needsHumanReview: false,
  element,
  explanation: "e",
  fix: "x",
  evidence: "verified",
});

const planted: Expected[] = [
  { label: "alt", wcag: ["1.1.1"], element: "logo.png" },
  { label: "link", wcag: ["2.4.4"] },
];

describe("scoreFixture", () => {
  it("counts matches, misses and extras", () => {
    const s = scoreFixture("x", planted, [
      f(["1.1.1"], '<img src="logo.png">'),
      f(["1.4.3"], "<p>"),
    ]);
    assert.equal(s.matched, 1);
    assert.deepEqual(s.missed.map((m) => m.label), ["link"]);
    assert.equal(s.extra.length, 1);
  });

  it("needs the right element when the answer key names one", () => {
    const s = scoreFixture("x", planted, [f(["1.1.1"], '<img src="hero.jpg">')]);
    assert.equal(s.matched, 0);
  });

  it("lets one finding match only one planted problem", () => {
    const twoAlts: Expected[] = [
      { label: "a", wcag: ["1.1.1"] },
      { label: "b", wcag: ["1.1.1"] },
    ];
    const s = scoreFixture("x", twoAlts, [f(["1.1.1"], "<img>")]);
    assert.equal(s.matched, 1);
  });
});

describe("summarise", () => {
  it("computes precision and recall across fixtures", () => {
    const t = summarise([
      scoreFixture("a", planted, [f(["1.1.1"], "logo.png"), f(["2.4.4"], "<a>")]),
      scoreFixture("clean", [], [f(["1.4.3"], "<p>")]),
    ]);
    assert.equal(t.precision, 2 / 3);
    assert.equal(t.recall, 1);
  });
});

describe("runEval", () => {
  it("runs fixtures through the real audit flow", async () => {
    const { scores, total } = await runEval(
      {
        llm: new MockLlm(),
        scanner: { scan: async () => [] }, // finds nothing, so nothing is reported
        fetchPage: async () => "",
      },
      [{ name: "clean", request: { kind: "html", html: "<p>ok</p>" }, expected: [] }],
    );
    assert.equal(scores[0].found, 0);
    assert.equal(total.precision, 1);
  });
});
