import { AFFECTED_LABELS, type AuditResponse } from "@accesslens/shared";

// Turn a report into Markdown, so it can be pasted into a ticket, a PR or a doc.
export function toMarkdown(report: AuditResponse): string {
  const lines = [
    "# AccessLens report",
    "",
    report.summary,
    "",
    `Model: ${report.model} · Prompt: ${report.promptVersion} · ${(report.durationMs / 1000).toFixed(1)}s`,
    "",
  ];
  report.findings.forEach((f, i) => {
    lines.push(
      `## ${i + 1}. ${f.title}`,
      "",
      `- Severity: ${f.severity}`,
      `- WCAG: ${f.wcag.join(", ") || "n/a"}`,
      `- Affects: ${f.affects.map((a) => AFFECTED_LABELS[a]).join(", ")}`,
      `- Found by: ${f.source === "automated" ? "scanner" : "AI review"} · Confidence: ${f.confidence}`,
    );
    if (f.needsHumanReview)
      lines.push("- **Needs human review** before you act on it");
    if (f.evidence === "not-found")
      lines.push("- **Unverified:** this code wasn't found in what was audited");
    lines.push(
      "",
      f.explanation,
      "",
      "Problem:",
      "```",
      f.element,
      "```",
      "Fix:",
      "```",
      f.fix,
      "```",
      "",
    );
  });
  return lines.join("\n");
}

export function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
