# MISO Direct LLM

Use this recipe when the app needs direct access to MISO-managed LLMs without wrapping the call in a MISO app.

## Files To Inspect

- `.miso/specs/api-integration/model-*.md`
- `src/lib/miso-sdk/miso-llm.ts`
- `references/miso/llm.md`
- `MisoDirectLlmAsk.tsx` from this folder

## Implementation

Copy `MisoDirectLlmAsk.tsx` to an app-owned component path when the app needs a complete Direct LLM prompt UI.

Call `getMisoLLMConfig()` before invoking a model. Build `targetModel` from `registered_provider_id` and `model_id`; do not hardcode provider registration ids across sessions.

### With Direct LLM Client Tools

Use this path when the model should decide when to call browser/app functions such as opening a canvas, creating a local artifact, updating PocketBase through browser-safe code, or invoking an app-owned action.

- Define client tools with `defineMisoLLMTools(...)` from `src/lib/miso-sdk/miso-llm.ts`.
- Run the loop by passing `tools` to `useMisoLLM(...)` or `useMisoLLMStream(...)`; use `streamMisoLLMWithTools(...)` only for lower-level streaming control.
- Treat these as Client Tools, not Workspace Tools. The server does not execute them; it only streams `tool_call` events and the browser executor returns `tool` messages.
- Tool names must be stable code identifiers, and each tool needs a description plus object-shaped `inputSchema`.
- If a client tool needs secrets or privileged external API access, route that action through a PocketBase hook using `proxyFetch` or through an existing Workspace Tool; do not put secrets in the browser executor.
- If Direct LLM should decide when to use a registered Workspace Tool, wrap `useMisoTool(...)` in a Client Tool executor and return the Workspace Tool result to the Direct LLM loop.

## Verification

- Empty `selected_models` is handled.
- Every direct LLM call includes `targetModel`.
- Multi-turn UIs store history outside the streaming `answer` buffer.
- Client Tool UI renders pending, success, and error states from tool invocations.
- Workspace Tool ids and parameter schemas, when wrapped by a Client Tool, come from `.miso/specs/api-integration/tool-*.md`.
