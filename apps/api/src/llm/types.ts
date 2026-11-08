// The small slice of the Claude Messages API this app uses.
// Docs: https://docs.claude.com/en/api/messages

import type { Text } from "axe-core";

export type TextBlock = { type: "text"; text: string };
export type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};
export type ToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

export type ContentBlock = TextBlock | ToolUseBlock;

export type Message =
  | { role: "user"; content: string | ToolResultBlock[] }
  | { role: "assistant"; content: ContentBlock[] };

export type ToolDefinition = {
  system: string;
  messages: Message[];
  tools: ToolDefinition[];
  maxTokens: number;
};

export type CreateMessageParams = {
  system: string;
  messages: Message[];
  tools: ToolDefinition[];
  maxTokens: number;
};

export type CreateMessageResult = {
  content: ContentBlock[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence" | string;
  usage: { inputTokens: number; outputTokens: number };
};

// Anything that can answer like Claude: the real API, the demo mock, or a test fake.
export interface LlmClient {
  model: string;
  createMessage(params: CreateMessageParams): Promise<CreateMessageResult>;
}
