# MISO Platform Recipes

Use these recipes when a feature connects to MISO-owned platform surfaces: site login, implementation-surface routing, files, env secrets, Chatflow apps, Agent apps, Workflow apps, Direct LLM, direct Tool calls, generic external API calls through the MISO runtime, or connected knowledge datasets.

Provider-specific backends such as PocketBase, Supabase, and Neon stay in their own recipe folders. Root `recipes/` is an index only.

## Choose The MISO Surface

| User asks for | Read first | Then read |
| --- | --- | --- |
| Decide where code belongs | `implementation-surface/README.md` | Relevant reference folder |
| Current MISO user or existing site login | `auth/README.md` | `references/miso/platform-auth.md` |
| Connect the visitor's or logged-in user's personal provider account through MISO connectors | Do not implement yet | MISO personal connector OAuth is currently unavailable in the API rollout. |
| Upload, download, or parse files | `files/README.md` | `references/pocketbase/files-binary-and-logs.md` |
| Need env secrets or public env values | `env-secrets/README.md` | `references/vite/env-assets-and-fetch.md` |
| Connect a Chatflow app | `chatflow/README.md` | `references/miso/chatflow.md` |
| Connect an Agent app | `agent/README.md` | `references/miso/agent.md` |
| Connect a Workflow app | `workflow/README.md` | `references/miso/workflow.md` |
| Call a MISO-managed LLM directly | `llm/README.md` | `references/miso/llm.md` |
| Give Direct LLM client-side tools it can request | `llm/README.md` | `references/miso/llm.md`, `src/lib/miso-sdk/miso-llm.ts` |
| Call a workspace Tool directly | `tool/README.md` | `references/miso/tool.md` |
| Call a public external API from browser code | `external-api/browser/README.md` | `references/vite/env-assets-and-fetch.md` |
| Call an external API with a secret key | `external-api/pocketbase-hook/README.md` | `env-secrets/README.md`, `references/pocketbase/jsvm-hooks-and-routes.md` |
| Search connected knowledge or build RAG | `knowledge-search/README.md` | `references/miso/knowledge-search.md` |

## Non-Negotiable Rules

- Read `.miso/specs/api-integration/*.md` before guessing app ids, workflow ids, tool provider ids, tool names, model ids, dataset ids, input keys, or file variable names.
- If a static spec looks stale or incomplete, use the runtime SDK helper for that surface, such as `useMisoAppParams(appId)` or `getMisoLLMConfig()`.
- Use SDK helpers from `src/lib/miso-sdk/`; do not hand-build `/__api/*` or `/ext/v1/*` calls when a helper exists.
- Do not set MISO `Authorization` headers in generated app code. The platform proxy handles session auth.
- Do not use MISO personal connector OAuth yet. `miso-connectors.ts`, `/__api/auth/connectors/*`, connector grants, connector tokens, and `connectorAuth` are unavailable in the current API rollout.
- Keep Direct LLM Client Tools separate from Workspace Tools. Client Tools are local browser/app functions exposed to Direct LLM through `miso-llm.ts`; Workspace Tools are registered platform tools invoked through `useMisoTool` and tool specs.
- For personal provider OAuth, do not call `/passport-deployed` from generated app code. Also do not replace it with MISO connector OAuth until that API ships.
- Keep multi-turn streaming history in app state. Hook `answer` values are current-turn buffers.
