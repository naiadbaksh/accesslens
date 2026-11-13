import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Finding } from "@accesslens/shared";
import { checkFindings, isInSource, normalise } from "./evidence.ts";

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  title: "Image has no alt text",
  severity: "critical",
  wcag: ["1.1.1"],
  source: "automated",
  affects: ["screen-reader"],
  confidence: "high",
  needsHumanReview: false,
  element: '<img src="logo.png">',
  explanation: "Screen reader users hear nothing.",
  fix: '<img src="logo.png" alt="Company logo">',
  ...overrides,
});

describe("normalise", () => {
  it("ignores quoting, spacing and self-closing slashes", () => {
    assert.equal(
      normalise('<img  src="logo.png" />'),
      normalise("<img src=logo.png>"),
    );
  });
});

describe("isInSource", () => {
  const source = `<body>\n  <img src=logo.png>\n  <a href="/more">Click here</a>\n</body>`;

  it("finds code the browser re-serialised", () => {
    assert.equal(isInSource('<img src="logo.png">', source), true);
  });

  it("accepts code shortened with an ellipsis if every piece is there", () => {
    assert.equal(isInSource('<a href="/more">…</a>', source), true);
  });

  it("rejects code that isn't in the source", () => {
    assert.equal(isInSource('<button class="buy">', source), false);
  });

  it("rejects fragments too short to prove anything", () => {
    assert.equal(isInSource("<a>", source), false);
    assert.equal(isInSource("", source), false);
  });
});

describe("checkFindings", () => {
  it("marks findings it can locate as verified and leaves them alone", () => {
    const [f] = checkFindings([finding()], "<img src=logo.png>");
    assert.equal(f.evidence, "verified");
    assert.equal(f.confidence, "high");
    assert.equal(f.needsHumanReview, false);
  });

  it("demotes findings it can't locate and asks for a human", () => {
    const [f] = checkFindings(
      [finding({ element: '<img src="hero.jpg">' })],
      "<img src=logo.png>",
    );
    assert.equal(f.evidence, "not-found");
    assert.equal(f.confidence, "low");
    assert.equal(f.needsHumanReview, true);
  });

  it("orders findings from most to least severe", () => {
    const out = checkFindings(
      [
        finding({ severity: "minor" }),
        finding({ severity: "critical" }),
        finding({ severity: "moderate" }),
      ],
      "<img src=logo.png>",
    );
    assert.deepEqual(
      out.map((f) => f.severity),
      ["critical", "moderate", "minor"],
    );
  });
});
