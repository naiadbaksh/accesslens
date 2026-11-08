// Retry a call that can fail for temporary reasons (rate limits, overload servers, network blips).
// Only use this for operations that are safe to repeat.

export class HttpError extends Error {
  constructor(
    public status: number,
    public body: string,
    public retryAfterMs?: number,
  ) {
    super(`HTTP ${status} ${body.slice(0, 200)}`);
    this.name = "HttpError";
  }
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504, 529]);

export function isRetryable(err: unknown): boolean {
  if (err instanceof HttpError) return RETRYABLE_STATUS.has(err.status);
  // fetch() throws TypeError on network failure; AbortSignal.timeout throws TimeoutError
  if (err instanceof Error)
    return err.name === "TypeError" || err.name === "TimeoutError";
  return false;
}

export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseDelayMs ?? 500;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts || !isRetryable(err)) throw err;
      const backoff = base * 2 ** (attempt - 1);
      const jitter = Math.random() * base;
      const serverHint =
        err instanceof HttpError ? err.retryAfterMs : undefined;
      await sleep(serverHint ?? backoff + jitter);
    }
  }
  throw lastError;
}
