import { useEffect, useRef, useState } from "react";
import type { AuditRequest, AuditResponse } from "@accesslens/shared";
import { AuditForm } from "./AuditForm.tsx";
import { Results } from "./Results.tsx";
import { runAudit } from "./api.ts";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; report: AuditResponse }
  | { status: "error"; message: string };

export function App() {
  const [state, setState] = useState<State>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  async function handleSubmit(req: AuditRequest) {
    controller.current?.abort(); // cancel an older audit if one is still running
    controller.current = new AbortController();
    setState({ status: "loading" });
    try {
      const report = await runAudit(req, controller.current.signal);
      setState({ status: "done", report });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState({ status: "error", message: (err as Error).message });
    }
  }

  // When results arrive, move keyboard and screen reader focus to them.
  useEffect(() => {
    if (state.status === "done") document.getElementById("results-heading")?.focus();
  }, [state.status]);

  return (
    <main>
      <h1>AccessLens</h1>
      <p className="intro">An AI agent that audits web pages and React Native components for accessibility (WCAG 2.2 AA).</p>

      <AuditForm busy={state.status === "loading"} onSubmit={handleSubmit} />

      {/* Screen readers announce changes to this region without moving focus */}
      <p role="status" aria-live="polite" className="status">
        {state.status === "loading" && "Auditing. The agent usually takes 15 to 40 seconds."}
      </p>
      {state.status === "error" && <p role="alert" className="error">{state.message}</p>}
      {state.status === "done" && <Results report={state.report} />}
    </main>
  );
}
