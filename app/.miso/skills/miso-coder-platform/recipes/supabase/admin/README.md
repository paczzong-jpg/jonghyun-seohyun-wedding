# Supabase Admin REST From PocketBase

## Use When

Use this recipe when the requested Supabase feature genuinely needs backend-only elevated access: imports, sync jobs, admin tables, controlled back-office mutations, migrations, or a route that must bypass browser RLS after validating user intent.

Do not use this to avoid writing correct RLS policies for normal browser CRUD, Auth, Realtime, or Storage features.

## Official Docs To Check

- API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Data API routes: https://supabase.com/docs/guides/api/creating-routes
- Securing Data API: https://supabase.com/docs/guides/api/securing-your-api

## Required Setup

1. Read `recipes/supabase/README.md`.
2. Request backend env values with `miso_env_vars_request`.
3. Copy `supabase-admin-rest.pb.js` to `api/supabase-admin-rest.pb.js`.
4. Customize the route path, allowed table, request validation, and authorization checks.

PocketBase hooks run in Goja/CommonJS. They cannot import `@supabase/supabase-js`, cannot use npm packages, cannot use ESM imports, and cannot use `async`/`await`.

All external calls from PocketBase hooks must use MISO `proxyFetch`. Do not use `$http.send`, shell networking, a custom Node server, or browser fallback URLs.

## Key Handling

- `SUPABASE_SECRET_KEY` is the primary backend-only key for new Supabase projects.
- `SUPABASE_SERVICE_ROLE_KEY` is the legacy backend-only elevated key for older projects.
- The example sends the key as `apikey`.
- For the legacy elevated JWT key, the example also sends `Authorization: Bearer <key>`.
- Never echo the key back in JSON, logs, error messages, or final answers.

## Verification

- PocketBase route loads without syntax errors.
- Missing env returns a clear server error.
- Invalid request body returns 400.
- Supabase REST failures return structured upstream details without leaking credentials.
- The route validates user intent before performing elevated mutations.
