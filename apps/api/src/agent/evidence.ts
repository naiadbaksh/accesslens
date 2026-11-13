import type { CheckedFinding, Finding, Severity } from "@accesslens/shared";

// The model is told to quote the offending code exactly. We don't take its word for it:
// every finding's `element` is checked against the code that was actually audited.
// A finding we can't locate may be a hallucination, so it's demoted to low confidence
// and flagged for a person to check, rather than silently dropped or silently trusted.

// Make two pieces of markup comparable even if quoting or spacing differs.
// The scanner reports elements as the browser re-serialised them (<img src="a.png">),
// while the user may have written <img src=a.png>, so both sides get the same treatment.
export function normalise(code: string): string {
  return code
    .toLowerCase()
    .replace(/=""/g, "") // boolean attributes: disabled="" -> disabled
    .replace(/["'`]/g, "") // quote style doesn't matter
    .replace(/\s*\/>/g, ">") // <br/> and <br> are the same element
    .replace(/\s+/g, " ") // collapse whitespace and line breaks
    .replace(/\s*([<>=])\s*/g, "$1") // spaces around tags and attributes don't matter
    .trim();
}

const MIN_PART = 6; // shorter fragments match too much to prove anything

export function isInSource(element: string, source: string): boolean {
  const haystack = normalise(source);
  // The model may shorten long code with an ellipsis. Every piece around it must appear.
  const parts = element
    .split(/…|\.\.\./)
    .map(normalise)
    .filter((p) => p.length >= MIN_PART);
  return parts.length > 0 && parts.every((p) => haystack.includes(p));
}

const RANK: Record<Severity, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

export function checkFindings(
  findings: Finding[],
  source: string,
): CheckedFinding[] {
  return findings
    .map((f): CheckedFinding => {
      if (isInSource(f.element, source)) return { ...f, evidence: "verified" };
      return {
        ...f,
        evidence: "not-found",
        confidence: "low",
        needsHumanReview: true,
      };
    })
    .sort((a, b) => RANK[a.severity] - RANK[b.severity]); // most severe first, every time
}
