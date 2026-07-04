# Neon Recipe

## Recipe Boundaries

Neon is a recipe, not a MISO reference surface. It is a top-level recipe, not a generic `integrations/` recipe. Do not create `references/neon/*` for this platform skill. Use official Neon docs for API behavior, and use this recipe for MISO-specific implementation boundaries.

This recipe covers generated website app work where Neon is the selected external database or auth provider:

- Browser table CRUD through Neon Data API and `@neondatabase/neon-js`: `recipes/neon/data-api/README.md`.
- Browser Neon Auth with the same client: `recipes/neon/auth/README.md`.
- Backend-only Neon Management API calls from PocketBase hooks: `recipes/neon/admin/README.md`.

Do not use this recipe when the user only needs PocketBase data, MISO datasets, or MISO site login. Use the matching PocketBase/MISO recipe instead.

## Official Docs To Check

- Data API get started: https://neon.com/docs/data-api/get-started
- Neon Auth and Data API TypeScript SDK: https://neon.com/docs/reference/javascript-sdk
- Data API access control: https://neon.com/docs/data-api/access-control
- Manage Data API: https://neon.com/docs/data-api/manage
- Node.js connection guide: https://neon.com/docs/guides/node
- Neon API reference: https://neon.com/docs/reference/api-reference

## Surface Decision

| Need | Read | Surface | Credential class |
| --- | --- | --- | --- |
| Browser reads/writes rows through Data API | `data-api/README.md` | Vite browser code with `@neondatabase/neon-js` | public Data API URL plus user JWT |
| Browser login with Neon Auth | `auth/README.md` | Vite browser code with Neon Auth helpers | public Auth URL plus public Data API URL |
| List projects, refresh Data API schema, or inspect Neon account resources | `admin/README.md` | PocketBase hook route using Neon Management API | backend-only Neon API key |

Neon Data API browser work is valid only when the Neon project has Data API enabled for the exact branch/database pair, the auth provider issues valid JWT tokens, database `GRANT` statements allow the role to touch the table, Row-Level Security policies restrict the rows, and CORS allowed origins include the generated site origin.

PocketBase hooks cannot import `@neondatabase/serverless`, `@neondatabase/neon-js`, `pg`, or other npm packages. They cannot open TCP database connections, cannot use ESM imports, and cannot use `async`/`await`. Backend Neon work in this sandbox uses HTTP APIs through `proxyFetch`.

## Env Request

Request the minimal values for the selected surface before coding against missing values. Use `miso_env_vars_request`; do not ask the user to paste secret values into chat.

For browser Data API plus Neon Auth:

```ts
{
  title: "Connect Neon",
  description: "Enter the Neon Data API and Auth values for this website app.",
  variables: [
    { key: "VITE_NEON_DATA_API_URL", target: "frontend", secret: false, required: true },
    { key: "VITE_NEON_AUTH_URL", target: "frontend", secret: false, required: true }
  ]
}
```

For backend-only Neon Management API operations:

```ts
{
  title: "Connect Neon admin API",
  description: "Enter the backend-only Neon API values for controlled PocketBase routes.",
  variables: [
    { key: "NEON_API_KEY", target: "backend", secret: true, required: true },
    { key: "NEON_PROJECT_ID", target: "backend", secret: false, required: false },
    { key: "NEON_BRANCH_ID", target: "backend", secret: false, required: false },
    { key: "NEON_DATABASE_NAME", target: "backend", secret: false, required: false }
  ]
}
```

Use `NEON_PROJECT_ID`, `NEON_BRANCH_ID`, and `NEON_DATABASE_NAME` only when the route needs to target a fixed project/branch/database. Do not put Neon API keys or database credentials in browser code.

## Data API Checklist

1. Enable Data API in the Neon Console for the exact branch/database pair.
2. Confirm the Data API URL is saved as `VITE_NEON_DATA_API_URL`.
3. Configure Neon Auth or a custom auth provider so browser requests have a valid JWT.
4. Apply `GRANT` privileges for the role used by the Data API.
5. Enable Row-Level Security and add policies for the exact `select`, `insert`, `update`, or `delete`.
6. Configure CORS allowed origins for the generated site domain.
7. Refresh schema cache after adding tables, columns, policies, or exposed schemas.

The Data API is enabled at the branch level. If the agent uses a URL from a different branch or database, correct code will still fail.

## Browser Setup

1. Install `@neondatabase/neon-js` if it is not already present and package policy allows it. If the package age policy blocks the newest release, use an older stable allowed release.
2. Copy `neonClient.ts` into `src/lib/neonClient.ts`.
3. Read the feature subrecipe before adding components.
4. Keep browser code limited to `VITE_NEON_DATA_API_URL`, `VITE_NEON_AUTH_URL`, and user-session JWTs managed by Neon Auth.

## Verification

- Env values were collected with `miso_env_vars_request`.
- Browser files contain only `VITE_NEON_DATA_API_URL` and `VITE_NEON_AUTH_URL`.
- No Neon API key, database credential, or connection string appears in browser files, console output, or final answers.
- Data API is enabled for the intended branch/database pair.
- `GRANT` privileges and Row-Level Security policies allow the intended operation.
- Data API CORS allowed origins include the site origin.
- Schema cache was refreshed after schema or policy changes.
- Backend route loads in PocketBase and external calls go through `proxyFetch`.

## Common Wrong Paths

- Creating `references/neon/*` or placing Neon under `recipes/integrations/` instead of keeping it as `recipes/neon/`.
- Putting `NEON_API_KEY`, database passwords, or connection strings in browser env.
- Trying to use the Neon Node.js connection guide directly inside PocketBase hooks.
- Importing `@neondatabase/serverless`, `@neondatabase/neon-js`, or `pg` inside `api/*.pb.js`.
- Calling Neon from the sandbox shell to test network behavior.
- Treating permission denied as a generic CORS problem before checking Data API branch, JWT, `GRANT`, Row-Level Security, CORS allowed origins, and schema cache.
