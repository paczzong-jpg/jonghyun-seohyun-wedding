# MISO Workspace Tool

SDK source under `src/lib/miso-sdk/` wins over this reference. Use the SDK helpers; do not call internal proxy routes directly from browser code.

## Workspace Tool vs Direct LLM Client Tool

- Workspace Tool: a platform-registered tool with `providerType`, `providerId`, `toolName`, and a generated `.miso/specs/api-integration/tool-*.md` spec. Invoke it with `useMisoTool(...)`.
- Direct LLM Client Tool: a browser/app function exposed to Direct LLM with `defineMisoLLMTools(...)` from `src/lib/miso-sdk/miso-llm.ts`. Direct LLM may request it, but browser code executes it.

Use this reference for Workspace Tools. Use `references/miso/llm.md` for Direct LLM Client Tools.

## Direct Workspace Tool Calls

Use `useMisoTool(providerType, providerId, toolName, appId?)`.

Allowed provider type values:

| `providerType` | Use |
| --- | --- |
| `builtin` | Platform built-in tools |
| `api` | Workspace custom API tools |
| `workflow` | Workflow-as-tool providers |
| `mcp` | MCP server tools |

`app` and unknown provider types are not supported. Use the concrete provider id, tool name, and parameter schema from `.miso/specs/api-integration/tool-*.md`; do not guess IDs.

Tool results distinguish transport errors from tool execution errors:

```ts
const { invoke, data, error } = useMisoTool("builtin", "google", "google_search", appId);
const result = await invoke({ query: "latest AI news" });

if (result.metadata.error) {
  // HTTP may still be 200; the tool itself failed.
}
```

`error` is a network/proxy-level error. Tool-level failures are reported as `data.metadata.error === true` with a message in `result`.

## Letting Direct LLM Decide When To Use A Workspace Tool

Direct LLM `tools` are providerless client manifests. They do not automatically invoke MISO Workspace Tools on the server.

If the model should choose when to use a Workspace Tool, wrap the SDK invocation in a Direct LLM Client Tool executor:

```ts
import { useMemo } from "react";
import { z } from "zod";
import { useMisoTool } from "@/lib/miso-sdk/miso-hooks";
import { defineMisoLLMTools } from "@/lib/miso-sdk/miso-llm";

const workspaceTool = useMisoTool("builtin", "google", "google_search", appId);

const directLlmTools = useMemo(
  () =>
    defineMisoLLMTools({
      searchWorkspaceTool: {
        description: "Search using the registered MISO Workspace Tool.",
        inputSchema: z.object({ query: z.string().min(1) }),
        execute: async ({ query }) => {
          const result = await workspaceTool.invoke({ query });
          if (result.metadata.error) {
            return { error: true, message: result.result };
          }
          return result.result;
        },
      },
    }),
  [workspaceTool.invoke],
);
```

Do not call React hooks inside `execute`; create the Workspace Tool hook in the component and close over its `invoke` function.

## Auth And Routing

- SM proxy handles session auth and credentials.
- Do not set `Authorization` manually for MISO tool calls.
- Pass `appId` to `useMisoTool` in multi-app workspaces so token routing stays correct.
- Do not manually construct `/__api/tools/invoke` calls when SDK helpers exist.

## Verification

- Confirm provider type, provider id, tool name, and parameter schema come from specs.
- Do not hardcode provider registration ids.
- Handle `metadata.error` even when HTTP status is successful.
- Confirm tool parameters match the generated tool spec.
