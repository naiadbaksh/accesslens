import { useEffect, useRef, useState } from "react";
import type { AuditRequest, AuditResponse } from "@accesslens/shared";
import { AuditForm } from "./AuditForm.tsx";
import { Results } from "./Results.tsx";
import { runAudit } from "./api.ts";

type State =
  | { status: "idle" }
  | { status: "loading"; startedAt: number }
  | { status: "done"; report: AuditResponse }
  | { status: "error"; message: string };

export function App() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const controller = useRef<AbortController | null>(null);

  async function handleSubmit(req: AuditRequest) {
    controller.current?.abort(); // cancel an older audit if one is still running
    controller.current = new AbortController();
    setState({ status: "loading", startedAt: Date.now() });
    try {
      const report = await runAudit(req, controller.current.signal);
      setState({ status: "done", report });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState({ status: "error", message: (err as Error).message });
    }
  }

  function cancel() {
    controller.current?.abort();
    setState({ status: "idle" });
  }

  // A visible timer while the agent works. It's kept out of the live region,
  // so screen readers aren't interrupted every second.
  useEffect(() => {
    if (state.status !== "loading") return;
    setElapsed(0);
    const id = setInterval(
      () => setElapsed(Math.round((Date.now() - state.startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [state]);

  // When results arrive, move keyboard and screen reader focus to them.
  useEffect(() => {
    if (state.status === "done") document.getElementById("results-heading")?.focus();
  }, [state.status]);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <p className="brand">AccessLens</p>
      </header>
      <main id="main">
        <h1>Audit accessibility with an AI agent</h1>
        <p className="intro">
          Checks web pages and React Native components against WCAG 2.2 AA. An automated
          scanner finds what it can, the AI reviews the rest, and anything a tool can't
          judge is flagged for a person.
        </p>

        <AuditForm busy={state.status === "loading"} onSubmit={handleSubmit} />

        {/* Screen readers announce changes to this region without moving focus */}
        <p role="status" aria-live="polite" className="status">
          {state.status === "loading" &&
            "Auditing. The agent usually takes 15 to 40 seconds."}
          {state.status === "done" && "Audit finished."}
        </p>
        {state.status === "loading" && (
          <div className="progress">
            <span className="spinner" aria-hidden="true" />
            <span aria-hidden="true">{elapsed}s</span>
            <button type="button" className="secondary small" onClick={cancel}>
              Cancel
            </button>
          </div>
        )}
        {state.status === "error" && (
          <p role="alert" className="error">
            {state.message}
          </p>
        )}
        {state.status === "done" && <Results report={state.report} />}
      </main>
    </>
  );
}
