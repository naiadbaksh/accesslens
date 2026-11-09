import { useState, type FormEvent } from "react";
import type { AuditRequest } from "@accesslens/shared";

type Kind = AuditRequest["kind"];

const SAMPLE_HTML = `<!doctype html>
<html>
  <body>
    <img src="logo.png">
    <h3>Become a monthly donor</h3>
    <input type="email" placeholder="Email">
    <div class="btn" onclick="submit()">Give now</div>
    <a href="/more">Click here</a>
  </body>
</html>`;

export function AuditForm(props: {
  busy: boolean;
  onSubmit: (req: AuditRequest) => void;
}) {
  const [kind, setKind] = useState<Kind>("html");
  const [html, setHtml] = useState(SAMPLE_HTML);
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (kind === "html") props.onSubmit({ kind, html });
    else if (kind === "url") props.onSubmit({ kind, url: url.trim() });
    else props.onSubmit({ kind, code });
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <fieldset>
        <legend>What do you want to audit?</legend>
        {(
          [
            ["html", "Paste HTML"],
            ["url", "A web page URL"],
            ["react-native", "A React Native component"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name="kind"
              value={value}
              checked={kind === value}
              onChange={() => setKind(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {kind === "html" && (
        <>
          <label htmlFor="html">HTML</label>
          <textarea
            id="html"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={12}
            required
            spellCheck={false}
          />
        </>
      )}
      {kind === "url" && (
        <>
          <label htmlFor="url">Page URL</label>
          <input
            id="url"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            aria-describedby="url-hint"
          />
          <p id="url-hint" className="hint">
            Public pages only. We fetch the HTML and don't run its scripts.
          </p>
        </>
      )}
      {kind === "react-native" && (
        <>
          <label htmlFor="code">Component code</label>
          <textarea
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={12}
            required
            spellCheck={false}
          />
        </>
      )}

      <button type="submit" disabled={props.busy}>
        {props.busy ? "Auditing…" : "Run audit"}
      </button>
    </form>
  );
}
