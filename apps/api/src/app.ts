import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createAudit, type AuditDeps } from "./audits.ts";

// Build the app from its dependencies, so tests can pass in fakes.
export function createApp(deps: AuditDeps, webOrigin: string) {
  const app = express();

  app.use(cors({ origin: webOrigin })); // only our web app may call this API from a browser
  app.use(express.json({ limit: "1mb" })); // reject huge bodies before they cost us anything

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, model: deps.llm.model });
  });

  // Each audit costs real money (AI tokens), so cap how often one client can run them.
  const auditLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  app.post("/api/audits", auditLimiter, async (req, res) => {
    const result = await createAudit(req.body, deps);
    res.status(result.status).json(result.body);
  });

  // Last line of defence: log the real error for us, send a safe message to the user.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // Express sets a 4xx status on client mistakes like malformed JSON or an oversized body.
    const status = (err as { status?: number })?.status;
    if (status && status >= 400 && status < 500) {
      res
        .status(status)
        .json({ error: status === 413 ? "too_large" : "bad_request" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}
