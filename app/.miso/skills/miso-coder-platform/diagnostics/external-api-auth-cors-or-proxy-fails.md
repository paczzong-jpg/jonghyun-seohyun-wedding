# External API Auth, CORS, Or Proxy Fails

## Symptoms

- 401 or 403 from external API.
- CORS-like browser failure.
- Request works elsewhere but fails in app.
- Secret appears missing or placeholder-like.

## Common Wrong Diagnosis

Adding a custom server or putting the private key into browser env.

## First Checks

1. Decide whether the key is public or private.
2. Public API: inspect browser fetch and `VITE_*` value.
3. Private API: inspect PocketBase hook, `_runtime_env.js`, and `proxyFetch`.
4. Check external provider status/error body.

## Commands Or Files To Inspect

- `recipes/miso/external-api/browser/README.md`
- `recipes/miso/external-api/pocketbase-hook/README.md`
- `api/*.pb.js`
- `/workspace/.coder/errors.jsonl`
- PocketBase logs

## Commands Or Files Not To Use

- Custom Express/Hono/Fastify server.
- Direct `$http.send()` in hooks.
- Secret logging.
- Managed proxy helper edits.

## Decision Tree

- Public key and browser-safe: fix browser fetch and env prefix.
- Private key: move request to PocketBase hook.
- Hook receives placeholder: use env secret diagnostic.
- External provider denies request: check provider credentials and scopes.

## Fix Path

Patch the selected surface and keep secrets out of browser code.

## Verification

Verify response status, error body, and absence of secret exposure.

## Return To Recipe

Return to the external API recipe that matches the selected surface.
