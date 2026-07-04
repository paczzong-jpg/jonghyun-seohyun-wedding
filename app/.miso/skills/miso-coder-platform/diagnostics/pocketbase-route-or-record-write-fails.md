# PocketBase Route Or Record Write Fails

## Symptoms

- `Token required`.
- 403 from collection schema mutation in browser.
- Record create/update fails.
- Custom route returns unexpected status.
- A list query with `sort` returns 400 (and the UI silently shows nothing).
- Saved records come back missing fields (only `id` / one field present).
- `Batch requests are not allowed`, batch timeout, or payload-too-large failures.

## Common Wrong Diagnosis

Changing frontend auth headers or mutating collections from browser code.

## First Checks

1. Confirm schema was created through the internal runtime API.
2. Confirm API rules are explicit empty strings when public access is intended.
3. Confirm browser code uses `runtime-client`.
4. Confirm hook routes use correct method/path.

## Commands Or Files To Inspect

- `${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections`
- `src/types/pb-types.ts`
- `src/lib/miso-sdk/runtime-client.ts`
- `api/*.pb.js`

## Commands Or Files Not To Use

- Browser collection mutation endpoints.
- Managed SDK edits.
- Direct DB file edits.

## Decision Tree

- `Token required`: fix collection rules.
- 403 on schema mutation from browser: move schema change to internal runtime API.
- Auto-cancel in concurrent reads: pass `$autoCancel: false`.
- Route status wrong: inspect hook logs and route handler.
- `sort` returns 400: the collection has no `created`/`updated` field (PocketBase 0.23+ does not auto-add them). Add `autodate` fields, or remove the sort.
- Records missing fields after a schema edit: a collection PATCH replaced `fields` wholesale and dropped them. Re-send the full `fields` list, then re-sync the data.
- Batch failures: the platform default is enabled but bounded (`maxRequests=50`, `timeout=5s`, `maxBodySize=1MiB`), and some environments may disable it. Do not try to raise limits from app code. Use batch only for small UI mutations; do bulk writes in a custom route with `$app.runInTransaction` and client chunking.

## Fix Path

Patch schema/rules through internal API, regenerate types, then update browser code if needed.

## Verification

Create, list, update, or delete a test record through the intended app path.

## Return To Recipe

Return to `recipes/pocketbase/crud/README.md`.
