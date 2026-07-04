# Verification Surfaces

## Frontend

- `/workspace/.coder/errors.jsonl`
- Browser UI behavior
- Network status and response body

## PocketBase

- Internal collection API under `${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections`
- PocketBase logs under `/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/logs`
- PocketBase service logs under `/internal/coder/apps/${RUNTIME_APP_ID}/logs?service=pocketbase`
- Generated types at `src/types/pb-types.ts`

## MISO SDK

- SDK source under `src/lib/miso-sdk/`
- App/model/tool/dataset specs under `.miso/specs/api-integration/`
- Hook return state: data, loading, streaming, and error fields

## External Services

Inspect an external source through a runtime `proxyFetch` route (e.g. a temporary `_probe` route returning status/size/first bytes), not a sandbox `curl`/`wget` — the sandbox has no CA bundle (TLS fails) and does not share the app's SM proxy path, so shell results are misleading.

- HTTP status and response text.
- Provider-specific error code.
- Credential placeholder vs real key state.

## Inspecting Data, Schema, And Parsing

Don't reach for a sandbox Node script to "check the data" — use the surface where it actually lives:

- Schema and records: read them through the collection/record API (`${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections`, and record list/get), not by parsing DB files.
- File parsing results (XLSX/CSV/ZIP): verify in the browser console via `agent-browser eval`, because parsing runs in the frontend — that's the representative path.
- If a Node script is genuinely needed, run it from `/workspace/app` (that's where `node_modules` is; a script under `/tmp` can't resolve packages), and remember inline Node eval commands are denied — write a temp `.cjs` in `/workspace/app` and delete it after.

## Completion Rule

Do not claim a feature works until the relevant surface has been checked. If a verification command is denied, use the closest supported log or SDK state instead of bypassing sandbox policy.
