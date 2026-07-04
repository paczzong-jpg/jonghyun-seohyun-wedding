# PocketBase Recipe

## Recipe Boundaries

PocketBase is the default app-owned runtime database inside generated MISO website apps. Use this recipe when the feature needs local app persistence, app-owned accounts, file fields, realtime record updates, custom PocketBase routes, or server-side hooks.

This recipe covers:

- Browser CRUD and schema setup: `recipes/pocketbase/crud/README.md`.
- App-owned PocketBase Auth: `recipes/pocketbase/auth/README.md`.
- PocketBase file fields and app file records: `recipes/pocketbase/files/README.md`.
- PocketBase realtime subscriptions: `recipes/pocketbase/realtime/README.md`.

Do not use this when the user chose Supabase or Neon as the backend. Use `recipes/supabase/README.md` or `recipes/neon/README.md` instead.

## Surface Decision

| Need | Read | Surface |
| --- | --- | --- |
| Create collections or persist app data | `crud/README.md` | Internal runtime schema API plus browser `runtime-client` |
| Email/password or provider login for app-owned users | `auth/README.md` | PocketBase auth collection through `runtime-client` |
| Store uploaded files with app records | `files/README.md` | PocketBase `file` fields through `runtime-client` |
| Subscribe to record changes | `realtime/README.md` | `pb.collection(...).subscribe(...)` through `runtime-client` |
| Server validation, custom routes, secret calls | `references/pocketbase/jsvm-hooks-and-routes.md` | `api/*.pb.js` hooks with `proxyFetch` |

## Non-Negotiable Rules

- Import the browser client from `@/lib/miso-sdk/runtime-client`.
- Do not create a custom Node, Express, Hono, or Next server.
- Do not mutate collection schemas from browser code.
- Do not call raw `/api/...`, `/realtime/...`, or `/api/realtime/...` paths from browser code.
- Do not edit platform-managed files such as `api/_runtime_proxy.js`, `api/_runtime_env.js`, or `src/lib/miso-sdk/runtime-client.ts`.

## Verification

- Collection rules and fields match the intended access model.
- Browser code uses `runtime-client`.
- Hooks load without PocketBase process errors.
- Realtime subscriptions are cleaned up on unmount.
- File flows store binary in file fields, not text fields.
