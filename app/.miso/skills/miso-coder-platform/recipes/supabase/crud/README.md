# Supabase CRUD

## Use When

Use this recipe when the user wants a generated website app to list, search, create, update, or delete rows in a Supabase Postgres table from the browser.

Do not use this for PocketBase collections, MISO datasets, or privileged admin data changes. Use `recipes/pocketbase/crud/README.md`, `recipes/miso/knowledge-search/README.md`, or `recipes/supabase/admin/README.md` instead.

## Official Docs To Check

- Data API routes: https://supabase.com/docs/guides/api/creating-routes
- Securing Data API: https://supabase.com/docs/guides/api/securing-your-api
- JavaScript select: https://supabase.com/docs/reference/javascript/select
- JavaScript insert: https://supabase.com/docs/reference/javascript/insert
- JavaScript update: https://supabase.com/docs/reference/javascript/update
- JavaScript delete: https://supabase.com/docs/reference/javascript/delete

## Required Setup

1. Read `recipes/supabase/README.md`.
2. Copy `recipes/supabase/supabaseClient.ts` to `src/lib/supabaseClient.ts`.
3. Confirm env values were requested with `miso_env_vars_request`.
4. Confirm the Supabase Data API exposes the table.
5. Confirm Row Level Security allows the exact browser operations for the active role.

Browser CRUD must use the publishable or legacy anon key. Do not put Supabase backend-only keys in browser code.

## Implementation

Copy `SupabaseCrudTable.tsx` into a component path such as `src/components/SupabaseCrudTable.tsx`, then replace:

- `todos` with the real table name.
- `id`, `task`, `is_complete`, and `inserted_at` with real columns.
- Validation and UI copy with the app's domain language.

The example intentionally uses normal browser SDK calls:

- `select` for loading rows.
- `insert` for creating a row.
- `update` for toggling a row.
- `delete` for deleting a row.

If any operation returns permission errors, fix Supabase grants/RLS policies. Do not move the whole feature to an elevated backend route just to bypass missing RLS.

## Verification

- The browser component imports `@/lib/supabaseClient`.
- Browser files only reference `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, or `VITE_SUPABASE_ANON_KEY`.
- A real row can be selected and the requested mutation works under the intended role.
- Permission failures are diagnosed with `diagnostics/supabase-rls-or-key-fails.md`.
- No direct shell network call was used for verification.
