import { z } from "zod";

// Read and check environment variables once, at startup. Fail fast with a clear message
// instead of crashing later in the middle of a request.
const Env = z
  .object({
    PORT: z.coerce.number().int().default(3001),
    LLM_MODE: z.enum(["anthropic", "mock"]).default("anthropic"),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default("claude-sonnet-5-5"),
    WEB_ORIGIN: z.string().default("http://localhost:5173"),
  })
  .refine((e) => e.LLM_MODE === "mock" || !!e.ANTHROPIC_API_KEY, {
    message:
      "Set ANTHROPIC_API_KEY in apps/api/.env, or set LLM_MODE=mock to run without one.",
  });

export const config = Env.parse(process.env);
