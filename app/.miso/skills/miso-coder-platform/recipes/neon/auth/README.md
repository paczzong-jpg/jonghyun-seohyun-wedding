# Neon Auth Recipe

## Use When

Use this when the user explicitly wants Neon Auth for app-level accounts. Neon Auth is not MISO site auth. MISO site auth controls who can open the generated website; Neon Auth controls users inside the app and supplies JWTs for Neon Data API.

## Official Docs To Check

- Neon Auth and Data API TypeScript SDK: https://neon.com/docs/reference/javascript-sdk
- Data API get started: https://neon.com/docs/data-api/get-started
- Data API access control: https://neon.com/docs/data-api/access-control
- Manage Data API: https://neon.com/docs/data-api/manage

## Required Neon Setup

- Neon Auth is enabled or a custom provider is configured for the Data API.
- `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL` are saved through `miso_env_vars_request`.
- Redirect/callback settings in Neon match the generated site origin.
- Data API validates the same provider that issues browser JWTs.
- Row-Level Security policies use JWT claims consistently. The user identifier must be present; a JWT token missing `sub` claim cannot drive per-user RLS correctly.

## Implementation

1. Request browser env from `recipes/neon/README.md`.
2. Copy `recipes/neon/neonClient.ts` to `src/lib/neonClient.ts`.
3. Copy `NeonAuthPanel.tsx` into the feature area.
4. If the user needs Google/GitHub/social auth, configure the provider in Neon first, then use the official `auth.signIn.social()` API.
5. Keep Neon Auth separate from MISO auth unless a feature explicitly bridges them. Do not assume a MISO logged-in user is also a Neon user.

## Verification

- `client.auth.signUp.email()` creates the expected Neon user or returns a provider validation error.
- `client.auth.signIn.email()` stores a session.
- `client.auth.getSession()` returns a session before Data API private queries.
- `client.auth.signOut()` clears the local session.
- Data API requests include the user's JWT and Row-Level Security enforces expected rows.

## Common Wrong Paths

- Treating Neon Auth as a replacement for MISO site auth.
- Storing Neon API keys in browser code.
- Skipping RLS because the user is signed in.
- Forgetting that changing the auth provider invalidates existing tokens for that provider.
