import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class FetchPageError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
    this.name = "FetchPageError";
  }
}

const MAX_BYTES = 2_000_000;

// Our server fetches URLs that users type in. Without a guard, someone could ask it to fetch
// http://localhost:5432 or a cloud metadata address and read our internal network (SSRF).
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7)); // IPv4-mapped
    return (
      v6 === "::1" ||
      v6 === "::" ||
      v6.startsWith("fc") ||
      v6.startsWith("fd") ||
      v6.startsWith("fe80")
    );
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) || // link-local, incl. cloud metadata 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) // carrier-grade NAT
  );
}

export async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true });
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new FetchPageError(
      "That address points to a private network, so it can't be scanned.",
      400,
    );
  }
}

export async function fetchPage(
  url: string,
  timeoutMs = 10_000,
): Promise<string> {
  const target = new URL(url);
  await assertPublicHost(target.hostname);

  let res: Response;
  try {
    res = await fetch(target, {
      redirect: "error", // a redirect could point somewhere private; keep v1 simple and refuse
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "AccessLens/0.1 (accessibility audit)" },
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new FetchPageError(
      timedOut
        ? "The page took too long to respond."
        : "Couldn't reach that page.",
      502,
    );
  }

  if (!res.ok)
    throw new FetchPageError(`The page returned HTTP ${res.status}.`, 502);
  if (!res.headers.get("content-type")?.includes("text/html")) {
    throw new FetchPageError("That URL isn't an HTML page.");
  }

  // Read the body in chunks and stop if it's too big, instead of loading everything into memory.
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new FetchPageError("That page is larger than 2 MB.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
