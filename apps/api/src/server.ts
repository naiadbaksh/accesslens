import "dotenv/config";
import { config } from "./config.ts";
import { createApp } from "./app.ts";
import { AnthropicClient } from "./llm/anthropic.ts";
import { MockLlm } from "./llm/mock.ts";
import { AxeScanner } from "./scanner/axeScanner.ts";
import { fetchPage } from "./scanner/fetchPage.ts";

// Wire the real dependencies together. This is the only file that knows about all of them.
const llm =
  config.LLM_MODE === "mock"
    ? new MockLlm()
    : new AnthropicClient(config.ANTHROPIC_API_KEY!, config.ANTHROPIC_MODEL);

const app = createApp(
  { llm, scanner: new AxeScanner(), fetchPage },
  config.WEB_ORIGIN,
);

app.listen(config.PORT, () => {
  console.log(
    `AccessLens API on http://localhost:${config.PORT} (model: ${llm.model})`,
  );
});
