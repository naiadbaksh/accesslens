import { HttpError, withRetry } from "../http/retry";
import type {
  CreateMessageParams,
  CreateMessageResult,
  LlmClient,
} from "./types.ts";

// Calls the Claude Message API with plain fetch, so every part of the request is visible.
// (The official @anthropic-ai/sdk does the same thing with more conveniences)

export class AnthropicClient implements LlmClient {
  constructor(
    private apiKey: string,
    public model: string,
    private timeoutMs = 60_000,
    private fetchImpl: typeof fetch = fetch,
  ) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is missing");
  }

  async createMessage(
    params: CreateMessageParams,
  ): Promise<CreateMessageResult> {
    return withRetry(async () => {
      const res = await this.fetchImpl(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "content-type": "applications/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: params.maxTokens,
            system: params.system,
            tools: params.tools,
            messages: params.messages,
          }),
          signal: AbortSignal.timeout(this.timeoutMs), //never wait forever on a third party
        },
      );

      if (!res.ok) {
        const retryAfter = Number(res.headers.get("retry-after"));
        throw new HttpError(
          res.status,
          await res.text(),
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : undefined,
        );
      }

      const data = (await res.json()) as {
        content: CreateMessageResult["content"];
        stop_reason: string;
        usage: { input_tokens: number; output_tokens: number };
      };
      return {
        content: data.content,
        stopReason: data.stop_reason,
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
        },
      };
    });
  }
}
