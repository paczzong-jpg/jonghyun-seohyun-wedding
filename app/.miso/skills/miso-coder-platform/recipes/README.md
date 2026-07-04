# Recipes Index

Use surface-specific directories when the feature belongs to one backend, service, or MISO platform surface. The root of this folder is an index only; implementation recipes must live in a surface directory.

## Surface Directories

| Directory | Use |
| --- | --- |
| `pocketbase/` | App-owned PocketBase data, auth, files, realtime, and imports |
| `supabase/` | Supabase app backend features |
| `neon/` | Neon Data API, auth, and management API |
| `miso/` | MISO site login, implementation-surface routing, files, env secrets, external API calls through browser or PocketBase hook runtime surfaces, Chatflow, Agent, Workflow, Direct LLM, Direct LLM Client Tools, Workspace Tools, and knowledge search |
| `integrations/` | Named external provider integrations such as Google, Slack, Kakao, Dooray, Notion, OpenDART, GitHub, Stripe, Teams, email, warehouses, BI tools, OAuth token bridge, and data.go.kr file data |

If a recipe is about MISO env secrets, MISO runtime proxying, MISO app/agent/workflow/LLM/tool/knowledge, Direct LLM Client Tools, Workspace Tools, or generic external API calls mediated by the MISO runtime, put it under `miso/`.
