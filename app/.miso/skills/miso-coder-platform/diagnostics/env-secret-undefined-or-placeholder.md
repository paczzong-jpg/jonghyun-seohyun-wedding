# Env Secret Undefined Or Placeholder

## Symptoms

- Browser `import.meta.env` value is `undefined`.
- Hook receives a placeholder-like value.
- External API returns unauthorized after secret setup.

## Common Wrong Diagnosis

Reading app env with OS env APIs inside PocketBase hooks.

## First Checks

1. Is the value public or private?
2. Public browser value needs `VITE_` prefix.
3. Private hook value must be read through platform runtime env helper.
4. Secret substitution happens through `proxyFetch`.
5. If the real value was never provided, request it with `miso_env_vars_request`.

## Commands Or Files To Inspect

- `.env` with approval if needed
- `api/*.pb.js`
- `api/README.md`
- `references/vite/env-assets-and-fetch.md`
- `recipes/miso/env-secrets/README.md`

## Commands Or Files Not To Use

- Secret printing.
- Managed runtime helper edits.
- Browser exposure for private keys.
- Asking the user to paste a secret into chat.

## Decision Tree

- Browser value undefined: add/check `VITE_` prefix and placeholder.
- Private value needed in hook: use `_runtime_env.js`.
- Placeholder persists in hook logs: ensure the external call goes through `proxyFetch`.
- Real value missing: call `miso_env_vars_request` with the correct `target` and `secret` flags.
- Provider still rejects: verify the saved value belongs to the selected provider/project.

## Fix Path

Move the value to the correct surface and update code to read it from that surface only. If the surface is correct but the value is absent, collect it through `miso_env_vars_request`; do not use chat paste or a manual managed-env edit.

## Verification

Confirm no private key appears in browser files or logs.

## Return To Recipe

Return to `recipes/miso/env-secrets/README.md`.
