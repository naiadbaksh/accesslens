import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AnthropicClient } from "./anthropic.ts";

describe("AnthropicClient", () => {
  it("sends the right headers and maps the response", async () => {
    let sent: RequestInit | undefined;
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      sent = init;
      return new Response(
        JSON.stringify({
          content: [{ type: "text", text: "hi" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 10, output_tokens: 2 },
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const client = new AnthropicClient(
      "test-key",
      "claude-test",
      5_000,
      fakeFetch,
    );
    const res = await client.createMessage({
      system: "s",
      messages: [{ role: "user", content: "x" }],
      tools: [],
      maxTokens: 100,
    });

    const headers = sent!.headers as Record<string, string>;
    assert.equal(headers["x-api-key"], "test-key");
    assert.equal(headers["anthropic-version"], "2023-06-01");
    assert.equal(JSON.parse(sent!.body as string).model, "claude-test");
    assert.ok(sent!.signal, "every call has a timeout signal");
    assert.equal(res.usage.inputTokens, 10);
  });
});
