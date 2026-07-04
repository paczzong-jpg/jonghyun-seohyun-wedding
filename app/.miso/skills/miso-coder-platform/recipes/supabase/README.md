# Supabase Recipe

## Recipe Boundaries

Supabase is a recipe, not a MISO reference surface. It is a top-level recipe, not a generic `integrations/` recipe. Do not create `references/supabase/*` for this platform skill. Use official Supabase docs for API behavior, and use this recipe for MISO-specific implementation boundaries.

This recipe covers generated website app work where Supabase is the selected app backend:

- Browser table CRUD with `@supabase/supabase-js`: `recipes/supabase/crud/README.md`.
- Browser Supabase Auth: `recipes/supabase/auth/README.md`.
- Browser Realtime subscriptions: `recipes/supabase/realtime/README.md`.
- Browser Supabase Storage uploads/download links: `recipes/supabase/files/README.md`.
- Backend-only privileged REST calls from PocketBase hooks: `recipes/supabase/admin/README.md`.

Do not use this recipe when the user only needs PocketBase data, MISO datasets, or MISO site login. Use the matching PocketBase/MISO recipe instead.

## Official Docs To Check

- React quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/reactjs
- JavaScript client initialization: https://supabase.com/docs/reference/javascript/initializing
- API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Data API routes: https://supabase.com/docs/guides/api/creating-routes
- Securing the Data API: https://supabase.com/docs/guides/api/securing-your-api
- JavaScript reference: https://supabase.com/docs/reference/javascript/introduction

## Surface Decision

| Need | Read | Surface | Key class |
| --- | --- | --- | --- |
| Browser reads/writes allowed by RLS | `crud/README.md` | Vite browser code with `@supabase/supabase-js` | publishable or legacy anon |
| Browser login with Supabase Auth | `auth/README.md` | Vite browser code with Supabase Auth helpers | publishable or legacy anon |
| Realtime subscription for public/RLS-safe rows | `realtime/README.md` | Vite browser code | publishable or legacy anon |
| Storage upload/download under policies | `files/README.md` | Vite browser code | publishable or legacy anon |
| Admin import, migration, sync, or bypass-RLS action | `admin/README.md` | PocketBase hook route using Supabase REST | secret or legacy service role |

PocketBase hooks cannot import `@supabase/supabase-js`, cannot use ESM imports, and cannot use npm packages. Backend Supabase work in this sandbox uses REST through `proxyFetch`.

## Env Request

Request the minimal keys for the selected surface before coding against missing values.

For browser-only work, request primary keys:

```ts
{
  title: "Connect Supabase",
  description: "Enter the Supabase project values for this website app.",
  variables: [
    { key: "VITE_SUPABASE_URL", target: "frontend", secret: false, required: true },
    { key: "VITE_SUPABASE_PUBLISHABLE_KEY", target: "frontend", secret: false, required: true }
  ]
}
```

For a legacy project, request the legacy browser key instead:

```ts
{
  title: "Connect Supabase legacy project",
  description: "Enter the existing Supabase project URL and legacy anon key.",
  variables: [
    { key: "VITE_SUPABASE_URL", target: "frontend", secret: false, required: true },
    { key: "VITE_SUPABASE_ANON_KEY", target: "frontend", secret: false, required: true }
  ]
}
```

For backend-only elevated work, add the primary backend key:

```ts
{
  title: "Connect Supabase admin route",
  description: "Enter the backend-only Supabase key for the PocketBase route.",
  variables: [
    { key: "SUPABASE_URL", target: "backend", secret: false, required: true },
    { key: "SUPABASE_SECRET_KEY", target: "backend", secret: true, required: true }
  ]
}
```

For a legacy backend project, use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_SECRET_KEY`. Both are backend-only. Do not ask the user to paste secret values into chat.

## Primary Keys And Legacy Keys

Use primary keys for new projects:

- `VITE_SUPABASE_PUBLISHABLE_KEY`: browser-visible. Safe only when RLS and grants make access safe.
- `SUPABASE_SECRET_KEY`: backend-only. It bypasses RLS through the service role and must never be exposed to browser code.

Use legacy keys when the user's project still depends on them:

- `VITE_SUPABASE_ANON_KEY`: browser-visible legacy anon key. Treat it like a publishable key.
- `SUPABASE_SERVICE_ROLE_KEY`: backend-only legacy elevated key. Treat it like a secret key.

Secret or legacy elevated access is for prior-authorized backend operations only: admin panels, sync jobs, data import, controlled back-office operations, or one-off routes that validate user intent before touching Supabase.

## Browser Setup

1. Install `@supabase/supabase-js` if it is not already present and package policy allows it. If package age policy blocks the newest release, use an older stable allowed release.
2. Copy `supabaseClient.ts` into `src/lib/supabaseClient.ts`.
3. Read the feature subrecipe before adding components.
4. Keep browser code limited to URL plus publishable or legacy anon key.

Data API must expose the table or function before browser queries work. Row Level Security must allow the exact `select`, `insert`, `update`, `delete`, Realtime, or Storage operation for the active role.

## Verification

- Env values were collected with `miso_env_vars_request`.
- Browser files contain only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, or `VITE_SUPABASE_ANON_KEY`.
- No backend-only key appears in browser files, console output, or final answers.
- Supabase Data API exposes the table/function.
- RLS policies allow intended browser operations.
- Backend route loads in PocketBase and external calls go through `proxyFetch`.
- Supabase permission errors are diagnosed as grants/RLS/key-surface issues, not generic CORS failures.

## Common Wrong Paths

- Creating `references/supabase/*` or placing Supabase under `recipes/integrations/` instead of keeping it as `recipes/supabase/`.
- Treating a publishable or legacy anon key as a secret.
- Putting a backend-only key in browser code.
- Using a backend key to hide missing RLS policies for browser features.
- Importing `@supabase/supabase-js` inside `api/*.pb.js`.
- Calling Supabase from the sandbox shell to test network behavior.
