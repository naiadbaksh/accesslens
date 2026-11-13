import { useMemo, useState } from "react";
import {
  AFFECTED_LABELS,
  type AffectedGroup,
  type AuditResponse,
  type Severity,
} from "@accesslens/shared";
import { download, toMarkdown } from "./report.ts";

const ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

export function Results({ report }: { report: AuditResponse }) {
  const [group, setGroup] = useState<AffectedGroup | "all">("all");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const counts = ORDER.map(
    (s) => [s, report.findings.filter((f) => f.severity === s).length] as const,
  );
  const needReview = report.findings.filter((f) => f.needsHumanReview).length;
  const unverified = report.findings.filter((f) => f.evidence === "not-found").length;

  // Only offer the groups that actually appear in this report.
  const groups = useMemo(
    () =>
      (Object.keys(AFFECTED_LABELS) as AffectedGroup[]).filter((g) =>
        report.findings.some((f) => f.affects.includes(g)),
      ),
    [report],
  );

  const shown = report.findings.filter(
    (f) =>
      (group === "all" || f.affects.includes(group)) &&
      (!reviewOnly || f.needsHumanReview),
  );

  async function copyFix(fix: string) {
    try {
      await navigator.clipboard.writeText(fix);
      setAnnouncement("Fix copied to the clipboard.");
    } catch {
      setAnnouncement("Couldn't copy. Select the code and copy it instead.");
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <section aria-labelledby="results-heading" className="card">
      <div className="results-head">
        <h2 id="results-heading" tabIndex={-1}>
          Results
        </h2>
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() =>
              download(`accesslens-${stamp}.md`, toMarkdown(report), "text/markdown")
            }
          >
            Download report
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              download(
                `accesslens-${stamp}.json`,
                JSON.stringify(report, null, 2),
                "application/json",
              )
            }
          >
            Download JSON
          </button>
        </div>
      </div>

      <p>{report.summary}</p>

      <ul className="counts" aria-label="Issues by severity">
        {counts.map(([s, n]) => (
          <li key={s} className={`sev sev-${s}`}>
            {n} {s}
          </li>
        ))}
      </ul>

      {report.findings.length > 0 && (
        <p className="review-summary">
          <strong>{needReview}</strong> of {report.findings.length}{" "}
          {report.findings.length === 1 ? "finding needs" : "findings need"} a
          person to confirm.
          {unverified > 0 &&
            ` ${unverified} couldn't be matched to your code, so treat ${unverified === 1 ? "it" : "them"} with caution.`}
        </p>
      )}

      {report.findings.length > 1 && (
        <fieldset className="filters">
          <legend>Filter findings</legend>
          <div>
            <label htmlFor="group">Who's affected</label>
            <select
              id="group"
              value={group}
              onChange={(e) => setGroup(e.target.value as AffectedGroup | "all")}
            >
              <option value="all">Everyone</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {AFFECTED_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={reviewOnly}
              onChange={(e) => setReviewOnly(e.target.checked)}
            />
            Only findings that need human review
          </label>
        </fieldset>
      )}

      {/* Announces filter results and copy confirmations without moving focus */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement ||
          (shown.length !== report.findings.length
            ? `Showing ${shown.length} of ${report.findings.length} findings.`
            : "")}
      </p>

      {shown.length === 0 && report.findings.length > 0 && (
        <p className="empty">No findings match these filters.</p>
      )}

      <ol className="findings">
        {shown.map((f) => {
          const i = report.findings.indexOf(f);
          return (
            <li key={i} className="finding">
              <h3>
                <span className={`sev sev-${f.severity}`}>{f.severity}</span>{" "}
                {f.title}
              </h3>
              <p className="meta">
                WCAG {f.wcag.join(", ") || "n/a"} ·{" "}
                {f.source === "automated" ? "Found by scanner" : "Found by AI review"} ·{" "}
                Confidence: {f.confidence}
              </p>
              <ul className="chips" aria-label="Affects">
                {f.affects.map((a) => (
                  <li key={a} className="chip">
                    {AFFECTED_LABELS[a]}
                  </li>
                ))}
              </ul>

              {f.evidence === "not-found" && (
                <p className="callout callout-warn">
                  <strong>Unverified.</strong> We couldn't find this code in what you
                  submitted, so the AI may have got it wrong.
                </p>
              )}
              {f.needsHumanReview && (
                <p className="callout callout-review">
                  <strong>Needs human review.</strong> A tool can't settle this. Check it
                  with someone who uses assistive technology.
                </p>
              )}

              <p>{f.explanation}</p>
              <details>
                <summary>Show the code and fix</summary>
                <p className="label">Problem</p>
                <pre>
                  <code>{f.element}</code>
                </pre>
                <p className="label">Fix</p>
                <pre>
                  <code>{f.fix}</code>
                </pre>
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => copyFix(f.fix)}
                  aria-label={`Copy fix for: ${f.title}`}
                >
                  Copy fix
                </button>
              </details>
            </li>
          );
        })}
      </ol>

      <details className="trace">
        <summary>
          How the agent worked ({report.steps.length} tool calls,{" "}
          {(report.durationMs / 1000).toFixed(1)}s, {report.model}, prompt{" "}
          {report.promptVersion})
        </summary>
        <ol>
          {report.steps.map((s, i) => (
            <li key={i}>
              {s.tool} {s.ok ? "" : "(failed)"} <code>{JSON.stringify(s.input)}</code>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
