# AccessLens

An AI agent that audits web pages and React Native components for accessibility problems (WCAG 2.2 AA), explains who each problem affects, and suggests a code fix.

You paste HTML, a URL, or a React Native component. The agent runs the axe-core accessibility engine, looks up the relevant WCAG criteria, reviews the code for things automated tools miss, and returns a structured report.

## How it works

```
React app ──POST /api/audits──▶ Express API
                                  │ 1. validate input (Zod)
                                  │ 2. fetch page (timeout, size cap, SSRF guard)
                                  ▼
                              Agent loop  ◀──────────────┐
                                  │ ask Claude what to do │ tool results
                                  ▼                       │
                     ┌─ run_accessibility_scan (axe-core + jsdom)
                     ├─ search_wcag (local WCAG knowledge base)
                     └─ submit_report (validated against the shared Zod schema)
                                  │
                                  ▼
                       Evidence check: is each finding's code really in the source?
                       (no → low confidence, flagged for human review)
```

- **`packages/shared`**: Zod schemas for the request and the report. Web, API and the AI's tool definitions all use them, so the contract can't drift.
- **`apps/api`**: Express 5 + TypeScript. Calls the Claude Messages API directly with `fetch`, with timeouts and retries with backoff on 429/5xx.
- **`apps/web`**: React 19 + Vite. Accessible itself: labelled inputs, a live region for status, focus moved to results.

## Run it

Requires Node 22+.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # add your ANTHROPIC_API_KEY, or set LLM_MODE=mock
npm run dev:api     # http://localhost:3001
npm run dev:web     # http://localhost:5173
npm test
npm run eval        # score the agent against pages with planted problems
```

## Design decisions

- **Plain `fetch` instead of the Anthropic SDK** so every part of the agent loop is visible: tool definitions, `tool_use` blocks, `tool_result` replies.
- **The model finishes by calling a `submit_report` tool** whose schema is generated from Zod. Bad output is sent back to the model with the validation errors instead of crashing.
- **Dependencies are injected** (`LlmClient`, `Scanner`, `fetchPage`), so tests run the full agent loop with fakes and no network.
- **Limits everywhere**: 8 agent turns, 60s per AI call, 10s and 2 MB per page fetch, 1 MB request bodies, 10 audits per minute per client.

## Trusting the output

Automated tools catch only part of what makes a product accessible. AccessLens is built to be honest about that:

- **Every finding says who it affects** (screen reader users, keyboard users, low vision, cognitive…), so teams can prioritise by people, not by rule IDs. The UI filters by group.
- **Confidence and human review.** The model rates each finding high, medium or low, and flags anything a tool can't settle (alt text quality, contrast worked out from CSS, reading order) for a person to check, ideally someone who uses assistive technology.
- **Evidence check.** The server looks for each finding's quoted code in what was actually audited. If it isn't there, the finding is marked *unverified*, dropped to low confidence and flagged for review. This catches hallucinated elements without silently deleting anything.
- **Prompt version.** Each response carries a short hash of the system prompt, so a change in results can be traced to a prompt change or a model change.

## Evals

`npm run eval` runs five fixtures through the same code path as the API: four with planted problems and one clean page that catches invented issues. It prints precision (how much of what was reported was real) and recall (how much of what was planted was found), lists every miss and extra, and saves the run to `apps/api/eval-results/`. Filter with `npm run eval -- low-contrast`. In mock mode only scanner findings are reported, so recall will be lower; use a real API key for real numbers.

## Known limitations

- jsdom doesn't render pages, so axe can't check colour contrast. The agent reviews CSS for contrast instead.
- Pages that build their content with JavaScript are scanned as delivered by the server, before scripts run.
- The SSRF guard checks DNS before fetching; a hostile DNS server could still change the answer between the check and the fetch (DNS rebinding). Redirects are refused for the same reason.

## Next

- Save audit history in Postgres
- Replace keyword search with semantic retrieval over the full WCAG text (embeddings + pgvector)
- An MCP server so Claude Code and Claude Desktop can call AccessLens as a tool
- More eval fixtures, including findings confirmed by real assistive technology users
- Stream the agent's steps to the UI as they happen (server-sent events)
