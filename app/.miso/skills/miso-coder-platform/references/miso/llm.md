# MISO Direct LLM

SDK source under `src/lib/miso-sdk/` wins over this reference. Use the SDK helpers; do not call external provider APIs or internal proxy routes directly from browser code.

## Direct LLM

Use MISO-managed direct LLM helpers instead of calling external provider APIs from browser code.

```ts
import {
  getMisoLLMConfig,
  useMisoLLMStream,
  type DirectLlmTargetModel,
} from "@/lib/miso-sdk/miso-llm";
```

Call `getMisoLLMConfig()` before invoking a model. Build `targetModel` from the returned `registered_provider_id` and `model_id`.

```ts
const config = await getMisoLLMConfig();
const first = config.selected_models[0];
const targetModel: DirectLlmTargetModel = {
  registeredProviderId: first.registered_provider_id,
  modelId: first.model_id,
};
```

`targetModel` must include both `registered_provider_id` and `model_id`. Missing `targetModel` causes a 400 response. Use either `getMisoLLMConfig()` or the generated `.miso/specs/api-integration/model-*.md` file. Do not hardcode provider registration ids across sessions.

## API Surface

| Function or hook | Use |
| --- | --- |
| `getMisoLLMConfig()` | Fetch selectable workspace/session models |
| `invokeMisoLLM(request)` | Non-streaming direct completion |
| `streamMisoLLM(request, options)` | Low-level SSE stream handle with `abort()` |
| `useMisoLLM()` | React non-streaming hook |
| `useMisoLLMStream()` | React streaming hook with volatile `answer` |
| `defineMisoLLMTools(defs)` | Build optional Direct LLM Client Tool manifests and browser executors |

Common `send` options:

| Option | Required | Notes |
| --- | --- | --- |
| `targetModel` | Yes | From config/spec |
| `systemPrompt` | No | System instruction |
| `history` | No | Previous direct LLM messages |
| `modelParameters` | No | Temperature and provider options |
| `tools` | No | Direct LLM Client Tool set from `defineMisoLLMTools(...)` |
| `maxToolSteps` | No | Maximum client-side tool loop turns |

Streaming events append `text_chunk` to `answer`, replace it on `message_replace`, and end on `message_end`.

## Streaming State

`useMisoLLMStream` has the same current-turn `answer` behavior as chat streaming. Store history outside the hook if the UI is multi-turn.

## Direct LLM Client Tools

Use Direct LLM Client Tools when the model should request app-owned browser actions during a Direct LLM turn. The server exposes the tool manifest to the model and streams `tool_call` events, but browser code executes the tool and sends the result back through the next Direct LLM request.

Client Tools are not MISO Workspace Tools. Do not use Workspace Tool provider ids as Direct LLM tool names, and do not expect the Direct LLM service to execute platform-registered tools. For registered Workspace Tools, use `references/miso/tool.md`; if Direct LLM should choose when to use one, wrap the `useMisoTool(...)` invocation in a Client Tool executor.

```ts
import { useMemo } from "react";
import { z } from "zod";
import {
  defineMisoLLMTools,
  useMisoLLM,
} from "@/lib/miso-sdk/miso-llm";
import pb from "@/lib/miso-sdk/runtime-client";

const tools = useMemo(
  () =>
    defineMisoLLMTools({
      createNote: {
        description: "Create a note in the current browser app.",
        inputSchema: z.object({
          title: z.string().min(1),
          body: z.string().min(1),
        }),
        execute: async ({ title, body }) => {
          const record = await pb.collection("notes").create({ title, body });
          return { id: record.id, title: record.title };
        },
      },
    }),
  [],
);

const llm = useMisoLLM();

await llm.send("Create a note for this plan.", {
  targetModel,
  systemPrompt: "Use tools only when they are necessary.",
  tools,
  maxToolSteps: 6,
});
```

For streaming UIs, pass the same `tools` and `maxToolSteps` options to `useMisoLLMStream().send(...)`.

Client Tool rules:

- Define tools with `defineMisoLLMTools(...)`; use `z.object(...)` or a raw object-shaped JSON Schema.
- Tool names must match stable code identifiers and must not be user-facing labels.
- Keep browser executors safe for the browser. For secrets, privileged external APIs, or provider OAuth, call an app-owned PocketBase hook with `proxyFetch` or wrap a registered Workspace Tool. Do not use MISO personal connectors for OAuth until that API rollout ships.
- Render `input-available`, `output-available`, and `output-error` states if the UI shows tool progress.
- Set `maxToolSteps` so a tool loop cannot run forever.

## Auth And Routing

- SM proxy handles session auth and credentials.
- Do not set `Authorization` manually for MISO direct LLM calls.
- Do not manually construct `/__api/llm/*` calls when SDK helpers exist.

## Verification

- Confirm `selected_models` is non-empty.
- Confirm every direct LLM call includes `targetModel`.
- Do not hardcode provider registration ids.
- Handle empty model config before rendering a send action.
- For Client Tools, verify the browser executor actually runs and the result returns to the model as a `tool` message.
- For wrapped Workspace Tools, verify `metadata.error` is handled and the provider id/tool schema came from `.miso/specs/api-integration/tool-*.md`.
