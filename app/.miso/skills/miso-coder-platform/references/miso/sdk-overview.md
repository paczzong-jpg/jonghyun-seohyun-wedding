# MISO SDK Overview

## Source Priority

The SDK source under `src/lib/miso-sdk/` wins over examples in skills. If a type or signature differs, read the SDK file first and adapt the example to the real source.

## Managed Files

Do not edit:

- `src/lib/miso-sdk/**`
- `src/lib/miso-client.ts`
- `.miso/specs/**`
- `.miso/skills/**`

## SDK Files

| File | Purpose |
| --- | --- |
| `miso-client.ts` | Service API client and SSE handling |
| `miso-hooks.ts` | React hooks for apps, workflows, files, tools, and knowledge |
| `miso-llm.ts` | Direct LLM config, invoke, stream, React hooks, and optional Client Tool support |
| `miso-auth.ts` | MISO site auth context helper for `GET /__api/auth/me` |
| `miso-connectors.ts` | MISO personal connector helpers. Currently unavailable for generated app work until the API OAuth rollout ships. |
| `runtime-client.ts` | PocketBase browser client |
| `site-client.ts` | Site/auth base helpers |

## Authentication And Proxying

MISO SDK helpers route through the managed sandbox/session proxy. Do not manually add platform auth headers unless the SDK source requires a parameter. Do not construct raw Service API paths when a helper exists.

Use `miso-auth.ts` when the app needs the current MISO user from the site login that already protects the website. It calls `/__api/auth/me`; do not rewrite that requirement as PocketBase login or OAuth.

MISO personal connector OAuth is currently unavailable in the API rollout. Do not use `miso-connectors.ts`, `/__api/auth/connectors/*`, `createMisoConnectorGrant`, `fetchMisoConnectorAccessToken`, connector grants, connector tokens, or `connectorAuth` in generated app work until this restriction is removed.

The notes below are retained only as future reference for the connector surface. They are not an active implementation path.

When the restriction is removed, connector provider API calls use one of these credential paths:

- PocketBase broker route: call `createMisoConnectorGrant()` in the browser, send the grant to an app-owned PB route, and call the provider with `runtimeProxy.proxyFetch({ connectorAuth })`.
- Browser SDK/direct frontend exception: call `createMisoConnectorGrant()` and `fetchMisoConnectorAccessToken()` from the browser. Use this only when a provider browser SDK or browser-only API requires an access token in frontend code.

When using the PocketBase broker route, separate the two route surfaces: MISO connector control-plane calls stay in `miso-connectors.ts` and use `getApiBase()` internally; app-owned PocketBase broker routes are runtime routes and browser code must call them with `getRuntimeBase()`, never raw `/api/...`.

Connector grants are short-lived and one-time use. One frontend action creates one grant, and one PB `connectorAuth` call or one browser `fetchMisoConnectorAccessToken()` call consumes it. Do not reuse a grant for retries, parallel requests, polling loops, or multiple backend routes; request a fresh grant instead.

The connector token bridge returns access-token-only credentials. It never returns refresh tokens, client secrets, OAuth client IDs, or token URLs. Do not persist access tokens in PocketBase records or frontend storage.

## Verification

- Read the hook/function signature in SDK source.
- Read matching `.miso/specs/api-integration/*.md` when available.
- If the spec is stale, runtime SDK responses and app params are more reliable.
