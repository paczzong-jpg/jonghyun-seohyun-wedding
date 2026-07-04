# Neon Data API Or Auth Fails

## Symptoms

- Neon browser query returns `401`, `403`, permission denied, or an empty list.
- Sign-in succeeds but Data API rows are not visible.
- Data API works in one Neon branch but not another.
- Browser reports CORS before any app data loads.

## Common Wrong Diagnosis

Adding `NEON_API_KEY` or database credentials to browser code. That hides the actual Data API/Auth/RLS problem and leaks secrets.

## First Checks

1. Confirm this feature should use Neon, not PocketBase or MISO auth.
2. Confirm env values were collected with `miso_env_vars_request`.
3. Confirm browser code uses only `VITE_NEON_DATA_API_URL` and `VITE_NEON_AUTH_URL`.
4. Confirm Data API disabled or wrong branch is not the cause: the URL must match the intended branch/database pair.
5. Confirm the user has a valid JWT from Neon Auth or the configured provider.
6. Confirm the JWT token missing `sub` claim is not the cause for per-user Row-Level Security.
7. Confirm `GRANT` privileges exist for the role and operation.
8. Confirm Row-Level Security policies allow the exact rows.
9. Confirm Data API CORS allowed origins include the generated site origin.
10. Confirm schema cache was refreshed after schema, policy, or exposed-schema changes.

## Commands Or Files To Inspect

- `recipes/neon/README.md`
- `recipes/neon/data-api/README.md`
- `recipes/neon/auth/README.md`
- `recipes/neon/admin/README.md`
- Neon official docs linked there
- Browser component using `src/lib/neonClient.ts`
- PocketBase hook route if the failing path uses `NEON_API_KEY`
- `/workspace/.coder/errors.jsonl`

## Commands Or Files Not To Use

- Neon API keys in browser files.
- Database credentials in browser files.
- PocketBase hook imports of Neon SDKs or drivers.
- Sandbox shell networking as proof of runtime behavior.

## Decision Tree

- Env missing: call `miso_env_vars_request`; do not ask for keys in chat.
- `401`: verify auth provider, JWT audience, token expiry, and `sub` claim.
- `403` or permission denied: verify `GRANT` before changing Row-Level Security policies.
- Empty data: verify Row-Level Security policy conditions and active JWT claims.
- Table or column missing: refresh schema cache and verify exposed schemas.
- Browser CORS error: verify CORS allowed origins in Neon Data API settings.
- Admin API error: keep `NEON_API_KEY` backend-only and inspect the controlled PB route response.
- Needs direct database credentials: use a different backend runtime; PocketBase hooks in this sandbox are HTTP-only for Neon.

## Fix Path

Keep browser code public and fix Neon-side Data API, Auth, `GRANT`, Row-Level Security, CORS, and schema cache settings. Use the backend route only for authorized Management API operations.

## Verification

Confirm the intended browser operation succeeds with the expected user session and no Neon API key or database credential in source.

## Return To Recipe

Return to `recipes/neon/README.md`, then the matching feature subrecipe.
