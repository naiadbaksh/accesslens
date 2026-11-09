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
```

## Design decisions

- **Plain `fetch` instead of the Anthropic SDK** so every part of the agent loop is visible: tool definitions, `tool_use` blocks, `tool_result` replies.
- **The model finishes by calling a `submit_report` tool** whose schema is generated from Zod. Bad output is sent back to the model with the validation errors instead of crashing.
- **Dependencies are injected** (`LlmClient`, `Scanner`, `fetchPage`), so tests run the full agent loop with fakes and no network.
- **Limits everywhere**: 8 agent turns, 60s per AI call, 10s and 2 MB per page fetch, 1 MB request bodies, 10 audits per minute per client.

## Known limitations

- jsdom doesn't render pages, so axe can't check colour contrast. The agent reviews CSS for contrast instead.
- Pages that build their content with JavaScript are scanned as delivered by the server, before scripts run.
- The SSRF guard checks DNS before fetching; a hostile DNS server could still change the answer between the check and the fetch (DNS rebinding). Redirects are refused for the same reason.

## Next

- Save audit history in Postgres
- Replace keyword search with semantic retrieval over the full WCAG text (embeddings + pgvector)
- An MCP server so Claude Code and Claude Desktop can call AccessLens as a tool
- An eval suite: fixtures with known issues, measuring precision and recall per model and prompt version
