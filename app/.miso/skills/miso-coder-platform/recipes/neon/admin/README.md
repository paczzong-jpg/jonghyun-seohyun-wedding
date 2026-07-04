# Neon Admin Recipe

## Use When

Use this when the generated app needs a controlled backend route for Neon Management API operations: listing projects, checking branch configuration, or refreshing Data API schema cache. This is not the path for ordinary browser CRUD.

## Official Docs To Check

- Neon API reference: https://neon.com/docs/reference/api-reference
- Data API get started: https://neon.com/docs/data-api/get-started
- Manage Data API: https://neon.com/docs/data-api/manage
- Node.js connection guide: https://neon.com/docs/guides/node

## MISO Runtime Boundary

Neon's Node.js guide is for a normal Node server. MISO PocketBase hooks run in Goja/CommonJS and cannot import Neon drivers, `pg`, ESM packages, or use `async`/`await`. Use the Neon Management API over HTTP through `proxyFetch`.

Do not put Neon API keys or database credentials in browser code. `NEON_API_KEY` is backend-only and must be collected with `miso_env_vars_request`.

## Env Request

Use the admin payload in `recipes/neon/README.md`. `NEON_API_KEY` is required. `NEON_PROJECT_ID`, `NEON_BRANCH_ID`, and `NEON_DATABASE_NAME` are optional until a route needs a fixed resource.

## Implementation

1. Copy `neon-management-api.pb.js` to `api/neon-management-api.pb.js`.
2. Keep the route read-only unless the user explicitly requested a mutation.
3. For schema cache refresh, use Neon API for the exact project/branch/database and keep the route restricted to authorized app users.
4. Do not expose the upstream API key, request headers, or full error bodies to the browser.

## Verification

- The hook file loads with PocketBase.
- The route returns a controlled JSON response.
- External calls use `runtimeProxy.proxyFetch`.
- Source contains no `$http.send`, `import`, `export`, `async`, `await`, Neon driver import, or `pg` import.
- Secrets are not logged.

## Common Wrong Paths

- Using shell networking to test Neon instead of a PocketBase route.
- Copying a Node driver example into a PB hook.
- Returning the Neon API key or raw request headers.
- Building admin routes before the user provides env through `miso_env_vars_request`.
