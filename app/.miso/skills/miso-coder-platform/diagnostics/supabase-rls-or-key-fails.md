# Supabase RLS Or Key Fails

## Symptoms

- Supabase request returns permission denied.
- Browser client cannot read rows.
- Key is missing or rejected.

## Common Wrong Diagnosis

Using an elevated key in browser code.

## First Checks

1. Confirm the browser app uses Supabase URL plus a publishable or legacy anon key only.
2. Confirm RLS policies allow the requested operation.
3. Confirm env values use `VITE_` prefix.
4. Check Supabase response error message.
5. If Supabase values are missing, request them with `miso_env_vars_request` from `recipes/supabase/README.md`.
6. Re-open the specific subrecipe for the failing feature: `crud`, `auth`, `realtime`, `files`, or `admin`.

## Commands Or Files To Inspect

- `recipes/supabase/README.md`
- `recipes/supabase/crud/README.md`
- `recipes/supabase/auth/README.md`
- `recipes/supabase/realtime/README.md`
- `recipes/supabase/files/README.md`
- `recipes/supabase/admin/README.md`
- Supabase official docs linked there
- Browser component using Supabase client
- `/workspace/.coder/errors.jsonl`

## Commands Or Files Not To Use

- Elevated credentials in browser.
- PocketBase hook imports of Supabase JS client.
- Managed config edits.

## Decision Tree

- Env missing: fix `VITE_` values for the browser URL and publishable or legacy anon key.
- Value not provided: call `miso_env_vars_request`; do not ask for keys in chat.
- CRUD permission denied: confirm Data API exposure, grants, and RLS for the exact `select`, `insert`, `update`, or `delete`.
- Auth error: confirm provider/dashboard settings, redirect URL, and user confirmation state.
- Realtime error: confirm the table is in the `supabase_realtime` publication and the subscribing role can read the rows.
- Storage error: confirm bucket policy, public/private access model, file restrictions, and Storage object RLS.
- Needs elevated access: use a backend route with a secret or legacy service_role key, not browser code.
- Package blocked: choose allowed version.

## Fix Path

Keep browser client public and fix Supabase-side authorization.

## Verification

Confirm browser request succeeds with intended RLS policy and no elevated key in source.

## Return To Recipe

Return to `recipes/supabase/README.md`, then the matching feature subrecipe.
