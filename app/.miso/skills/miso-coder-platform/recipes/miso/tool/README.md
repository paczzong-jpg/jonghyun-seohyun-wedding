# MISO Tool

Use this recipe when the app needs to invoke a registered MISO Workspace Tool directly.

Workspace Tools are platform-registered tools described by `.miso/specs/api-integration/tool-*.md`. They are different from Direct LLM Client Tools in `src/lib/miso-sdk/miso-llm.ts`, which are local browser/app executors that Direct LLM can request during a model turn.

## Files To Inspect

- `.miso/specs/api-integration/tool-*.md`
- `src/lib/miso-sdk/miso-hooks.ts`
- `references/miso/tool.md`
- `MisoToolInvoker.tsx` from this folder

## Implementation

Copy `MisoToolInvoker.tsx` to an app-owned component path when the app needs a complete direct tool invocation UI.

Use `useMisoTool(providerType, providerId, toolName, appId?)`. Allowed provider type values are `builtin`, `api`, `workflow`, and `mcp`; do not use `app`.

Tool execution failures can arrive as HTTP 200 with `metadata.error === true`, so check that separately from network/proxy `error`.

### If Direct LLM Should Choose This Tool

Do not pass `providerType`, `providerId`, or `toolName` directly as a Direct LLM tool manifest and expect MISO to execute the Workspace Tool on the server. Instead:

1. Read this recipe and the matching `tool-*.md` spec.
2. Create a browser function that invokes `useMisoTool(...)` with the concrete provider id, tool name, and parameters.
3. Expose that function as a Direct LLM Client Tool with `defineMisoLLMTools(...)` from `src/lib/miso-sdk/miso-llm.ts`.
4. Return the Workspace Tool result, including `metadata.error`, to the Direct LLM loop so the model can continue with the actual output.

## Verification

- Provider type, provider id, tool name, and parameter schema come from `.miso/specs/api-integration/tool-*.md`.
- Tool parameters are not inferred from labels.
- The UI renders `metadata.error` as a tool failure.
- Direct LLM integrations that use this tool wrap it through a Client Tool executor instead of inventing provider ids in `tools`.
