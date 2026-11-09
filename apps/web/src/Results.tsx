import type { AuditResponse, Finding } from "@accesslens/shared";

const ORDER: Finding["severity"][] = ["critical", "serious", "moderate", "minor"];

export function Results({ report }: { report: AuditResponse }) {
  const counts = ORDER.map((s) => [s, report.findings.filter((f) => f.severity === s).length] as const);

  return (
    <section aria-labelledby="results-heading" className="card">
      <h2 id="results-heading" tabIndex={-1}>Results</h2>
      <p>{report.summary}</p>
      <ul className="counts" aria-label="Issues by severity">
        {counts.map(([s, n]) => <li key={s} className={`sev sev-${s}`}>{n} {s}</li>)}
      </ul>

      <ol className="findings">
        {report.findings.map((f, i) => (
          <li key={i} className="finding">
            <h3>
              <span className={`sev sev-${f.severity}`}>{f.severity}</span> {f.title}
            </h3>
            <p className="meta">
              WCAG {f.wcag.join(", ") || "n/a"} · {f.source === "automated" ? "Found by scanner" : "Found by AI review"}
            </p>
            <p>{f.explanation}</p>
            <details>
              <summary>Show the code and fix</summary>
              <p className="label">Problem</p>
              <pre><code>{f.element}</code></pre>
              <p className="label">Fix</p>
              <pre><code>{f.fix}</code></pre>
            </details>
          </li>
        ))}
      </ol>

      <details className="trace">
        <summary>How the agent worked ({report.steps.length} tool calls, {(report.durationMs / 1000).toFixed(1)}s, {report.model})</summary>
        <ol>
          {report.steps.map((s, i) => (
            <li key={i}>{s.tool} {s.ok ? "" : "(failed)"} <code>{JSON.stringify(s.input)}</code></li>
          ))}
        </ol>
      </details>
    </section>
  );
}
