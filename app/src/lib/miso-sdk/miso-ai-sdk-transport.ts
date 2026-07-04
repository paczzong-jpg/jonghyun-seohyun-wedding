/// <reference types="vite/client" />

/**
 * MISO ⇄ Vercel AI SDK `ChatTransport` adapter.
 *
 * Compatible with AI SDK v6 and v7: the `ChatTransport` / `UIMessage` /
 * `UIMessageChunk` shapes used here are structurally identical across both
 * majors (verified against ai@6.0.219 `.d.ts` and the v7 contract). To keep
 * this file free of a hard dependency on `ai`, those types are declared
 * locally rather than imported — the only import is the local MISO SDK.
 *
 * Usage (in an app that has installed `ai@6+` / `@ai-sdk/react`):
 *
 *   import { useChat } from "@ai-sdk/react";
 *   import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
 *   import { MisoChatTransport } from "@/lib/miso-sdk/miso-ai-sdk-transport";
 *
 *   const chat = useChat({
 *     transport: new MisoChatTransport({
 *       targetModel: { registeredProviderId, modelId },
 *       tools: toolManifests, // optional DirectLlmToolManifest[]
 *     }),
 *     onToolCall: async ({ toolCall }) => {
 *       // execute client tool, then:
 *       // addToolOutput({ tool, toolCallId: toolCall.toolCallId, output })
 *     },
 *     sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
 *   });
 *
 * Note: MISO tool execution is the app's responsibility via `useChat`'s
 * `onToolCall` + `addToolOutput`; this transport only translates the wire
 * protocol in both directions.
 */

import {
  streamMisoLLM,
  type DirectLlmMessage,
  type DirectLlmStreamHandle,
  type DirectLlmTargetModel,
  type DirectLlmToolCall,
  type DirectLlmToolManifest,
} from "./miso-llm";

// ---------------------------------------------------------------------------
// Local structural mirror of the AI SDK v6/v7 types (do NOT import "ai")
// ---------------------------------------------------------------------------

type FinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other"
  | "unknown";

/** The subset of `UIMessageChunk` this transport emits. */
type UIMessageChunk =
  | { type: "start"; messageId?: string }
  | { type: "finish"; finishReason?: FinishReason; messageMetadata?: unknown }
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  | { type: "reasoning-start"; id: string }
  | { type: "reasoning-delta"; id: string; delta: string }
  | { type: "reasoning-end"; id: string }
  | {
      type: "tool-input-available";
      toolCallId: string;
      toolName: string;
      input: unknown;
      dynamic?: true;
    }
  | { type: "error"; errorText: string };

/**
 * A UIMessage part. Tool parts use `type: "tool-<NAME>"` or `"dynamic-tool"`;
 * fields beyond the common ones are optional and discriminated at runtime.
 */
interface UIMessagePart {
  type: string;
  text?: string;
  toolName?: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

interface UIMessage {
  id: string;
  role: "system" | "user" | "assistant";
  parts: UIMessagePart[];
}

interface ChatRequestOptions {
  headers?: Record<string, string> | Headers;
  body?: object;
  metadata?: unknown;
}

interface ChatTransport<UI_MESSAGE> {
  sendMessages: (
    options: {
      trigger: "submit-message" | "regenerate-message";
      chatId: string;
      messageId: string | undefined;
      messages: UI_MESSAGE[];
      abortSignal: AbortSignal | undefined;
    } & {
      headers?: Record<string, string> | Headers;
      body?: object;
      metadata?: unknown;
    },
  ) => Promise<ReadableStream<UIMessageChunk>>;
  reconnectToStream: (
    options: { chatId: string } & ChatRequestOptions,
  ) => Promise<ReadableStream<UIMessageChunk> | null>;
}

// ---------------------------------------------------------------------------
// UIMessage[] → DirectLlmMessage[] (deserialization is the transport's job)
// ---------------------------------------------------------------------------

function isToolPart(part: UIMessagePart): boolean {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

function toolNameOf(part: UIMessagePart): string {
  if (part.type === "dynamic-tool") return part.toolName ?? "";
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return part.toolName ?? "";
}

function collectText(parts: UIMessagePart[]): string {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("");
}

function uiMessagesToDirectLlm(messages: UIMessage[]): DirectLlmMessage[] {
  const result: DirectLlmMessage[] = [];

  for (const message of messages) {
    const text = collectText(message.parts);

    if (message.role === "system") {
      if (text) result.push({ role: "system", content: text });
      continue;
    }
    if (message.role === "user") {
      result.push({ role: "user", content: text });
      continue;
    }

    // assistant: emit tool_calls only for parts that have resolved.
    const completedToolParts = message.parts.filter(
      (part) =>
        isToolPart(part) &&
        (part.state === "output-available" || part.state === "output-error"),
    );

    if (completedToolParts.length > 0) {
      const toolCalls: DirectLlmToolCall[] = completedToolParts.map((part) => ({
        id: part.toolCallId ?? "",
        name: toolNameOf(part),
        arguments: JSON.stringify(part.input ?? {}),
      }));
      result.push({ role: "assistant", content: text, toolCalls });

      for (const part of completedToolParts) {
        const content =
          part.state === "output-error"
            ? JSON.stringify({ error: part.errorText ?? "tool error" })
            : JSON.stringify(part.output ?? null);
        result.push({
          role: "tool",
          content,
          toolCallId: part.toolCallId ?? "",
          name: toolNameOf(part),
        });
      }
    } else if (text) {
      result.push({ role: "assistant", content: text });
    }
  }

  return result;
}

function mapFinishReason(reason: string | undefined): FinishReason {
  switch (reason) {
    case "tool_calls":
      return "tool-calls";
    case "length":
    case "max_tokens":
      return "length";
    default:
      return "stop";
  }
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export interface MisoChatTransportOptions {
  targetModel: DirectLlmTargetModel;
  systemPrompt?: string;
  modelParameters?: Record<string, unknown>;
  tools?: DirectLlmToolManifest[];
}

export class MisoChatTransport implements ChatTransport<UIMessage> {
  private readonly targetModel: DirectLlmTargetModel;
  private readonly systemPrompt?: string;
  private readonly modelParameters?: Record<string, unknown>;
  private readonly tools?: DirectLlmToolManifest[];

  constructor(options: MisoChatTransportOptions) {
    this.targetModel = options.targetModel;
    this.systemPrompt = options.systemPrompt;
    this.modelParameters = options.modelParameters;
    this.tools = options.tools;
  }

  sendMessages(options: {
    trigger: "submit-message" | "regenerate-message";
    chatId: string;
    messageId: string | undefined;
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
    headers?: Record<string, string> | Headers;
    body?: object;
    metadata?: unknown;
  }): Promise<ReadableStream<UIMessageChunk>> {
    const misoMessages = uiMessagesToDirectLlm(options.messages);
    const { abortSignal, messageId } = options;
    const targetModel = this.targetModel;
    const systemPrompt = this.systemPrompt;
    const modelParameters = this.modelParameters;
    const tools = this.tools;

    const stream = new ReadableStream<UIMessageChunk>({
      start(controller) {
        let counter = 0;
        let textId: string | null = null;
        let reasoningId: string | null = null;
        let finished = false;

        const nextId = (prefix: string) => `${prefix}-${counter++}`;
        const closeText = () => {
          if (textId) {
            controller.enqueue({ type: "text-end", id: textId });
            textId = null;
          }
        };
        const closeReasoning = () => {
          if (reasoningId) {
            controller.enqueue({ type: "reasoning-end", id: reasoningId });
            reasoningId = null;
          }
        };

        controller.enqueue({ type: "start", messageId });

        const handle: DirectLlmStreamHandle = streamMisoLLM(
          {
            messages: misoMessages,
            targetModel,
            systemPrompt,
            modelParameters,
            tools: tools && tools.length > 0 ? tools : undefined,
          },
          {
            onEvent: (event) => {
              switch (event.event) {
                case "text_chunk": {
                  const delta =
                    typeof event.answer === "string" ? event.answer : "";
                  if (!delta) break;
                  closeReasoning();
                  if (!textId) {
                    textId = nextId("text");
                    controller.enqueue({ type: "text-start", id: textId });
                  }
                  controller.enqueue({ type: "text-delta", id: textId, delta });
                  break;
                }
                case "message_replace": {
                  // MISO sends a full-answer replacement. We can't rewind
                  // already-emitted deltas, so we close the current text part
                  // and emit the entire replacement as one delta on a fresh
                  // part. Consumers should treat the last text part as final.
                  const answer =
                    typeof event.answer === "string" ? event.answer : "";
                  closeReasoning();
                  closeText();
                  textId = nextId("text");
                  controller.enqueue({ type: "text-start", id: textId });
                  controller.enqueue({
                    type: "text-delta",
                    id: textId,
                    delta: answer,
                  });
                  break;
                }
                case "reasoning":
                case "reasoning_chunk": {
                  const delta =
                    typeof event.answer === "string"
                      ? event.answer
                      : typeof event.data?.text === "string"
                        ? event.data.text
                        : "";
                  if (!delta) break;
                  if (!reasoningId) {
                    reasoningId = nextId("reasoning");
                    controller.enqueue({
                      type: "reasoning-start",
                      id: reasoningId,
                    });
                  }
                  controller.enqueue({
                    type: "reasoning-delta",
                    id: reasoningId,
                    delta,
                  });
                  break;
                }
                case "tool_call": {
                  const data = event.data ?? {};
                  const toolCallId =
                    typeof data.id === "string" ? data.id : "";
                  const toolName =
                    typeof data.name === "string" ? data.name : "";
                  const argsStr =
                    typeof data.arguments === "string" ? data.arguments : "";
                  let input: unknown;
                  try {
                    input = argsStr ? JSON.parse(argsStr) : {};
                  } catch {
                    input = argsStr;
                  }
                  closeText();
                  closeReasoning();
                  controller.enqueue({
                    type: "tool-input-available",
                    toolCallId,
                    toolName,
                    input,
                    dynamic: true,
                  });
                  break;
                }
                case "message_end": {
                  closeText();
                  closeReasoning();
                  const data = event.data ?? {};
                  const finishReason = mapFinishReason(
                    typeof data.finish_reason === "string"
                      ? data.finish_reason
                      : undefined,
                  );
                  controller.enqueue({
                    type: "finish",
                    finishReason,
                    messageMetadata: {
                      usage: data.usage,
                      model: data.model ?? data.selected_model,
                    },
                  });
                  finished = true;
                  break;
                }
              }
            },
            onError: (err) => {
              controller.enqueue({ type: "error", errorText: err.message });
              controller.close();
            },
            onDone: () => {
              closeText();
              closeReasoning();
              if (!finished) {
                controller.enqueue({ type: "finish", finishReason: "stop" });
              }
              controller.close();
            },
          },
        );

        if (abortSignal) {
          if (abortSignal.aborted) handle.abort();
          else abortSignal.addEventListener("abort", () => handle.abort(), { once: true });
        }
      },
    });

    return Promise.resolve(stream);
  }

  reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return Promise.resolve(null);
  }
}
