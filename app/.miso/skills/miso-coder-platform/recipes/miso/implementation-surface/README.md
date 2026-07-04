# Choose Implementation Surface

## When To Use

Use this before implementing any feature that touches data, files, external APIs, MISO apps, LLMs, tools, or sandbox commands.

## Decision Table

| Need | Surface |
| --- | --- |
| UI state, display, forms, public API call | Vite React browser code |
| App data records | PocketBase browser SDK |
| Collection create/update | Internal runtime API through sandbox command |
| Server validation or enrichment | `api/*.pb.js` PocketBase hook |
| Secret external API | PocketBase hook with `_runtime_env.js` and `proxyFetch` |
| Public external API | Browser `fetch` with public `VITE_*` value |
| MISO Chat, Agent, Advanced Chat, Workflow | MISO SDK hooks |
| Direct LLM or direct tool | MISO SDK direct helpers |
| Knowledge/RAG | `useMisoKnowledge` plus app or direct LLM |
| File attached to MISO app | MISO file upload or `remote_url`/`local_file` |
| File stored with app records | PocketBase file field |
| Uploaded document inspection | Isolated document/vision summary, not text read |

## Files To Inspect

- `INSTRUCTIONS.md`
- `.miso/rules/10-skill-routing.md`
- `recipes/miso/README.md` when using MISO login, app, Agent, Workflow, LLM, Tool, or knowledge surfaces
- Matching `.miso/specs/api-integration/*.md`
- `src/lib/miso-sdk/` source when using MISO SDK
- `api/README.md` when writing PocketBase hooks

## Files To Edit

- Browser/UI: `src/**/*.tsx`, `src/**/*.ts`
- PocketBase hooks: `api/*.pb.js`
- Styles: app-owned CSS files

## Files Not To Edit

- `src/lib/miso-sdk/**`
- `src/components/ui/**`
- `.miso/**`
- `api/_runtime_proxy.js`
- `.npmrc`, lockfiles, `vite.config.ts`

## Verification

Match verification to the selected surface. Browser work uses `/workspace/.coder/errors.jsonl`; PocketBase hooks use PB logs; MISO SDK work checks SDK state and specs.

## Common Wrong Paths

- Custom Express/Hono/Fastify server for a website app.
- Browser secret handling for private API keys.
- Schema mutation from browser code.
- Package imports inside PocketBase hooks.
