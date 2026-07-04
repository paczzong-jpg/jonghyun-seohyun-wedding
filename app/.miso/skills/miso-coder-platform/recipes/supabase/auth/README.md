# Supabase Auth

## Use When

Use this recipe when the user explicitly wants Supabase Auth accounts, sessions, email/password login, or Supabase provider login inside the generated website app.

Supabase Auth is not MISO site auth. If the requirement is "use the MISO logged-in user" or "send public users to MISO login", use `recipes/miso/auth/README.md` instead.

## Official Docs To Check

- React Auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react
- Sign in with password: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- Sign up: https://supabase.com/docs/reference/javascript/auth-signup
- Sign out: https://supabase.com/docs/reference/javascript/auth-signout
- Auth state changes: https://supabase.com/docs/reference/javascript/auth-onauthstatechange

## Required Setup

1. Read `recipes/supabase/README.md`.
2. Copy `recipes/supabase/supabaseClient.ts` to `src/lib/supabaseClient.ts`.
3. Confirm browser env values were requested with `miso_env_vars_request`.
4. In Supabase Dashboard, enable the Auth providers and redirect URLs required by the user.

For OAuth providers, configure provider client IDs and provider client secrets in Supabase Dashboard. Do not put OAuth client secrets in `VITE_*`, app source, screenshots, logs, or chat.

## Implementation

Copy `SupabaseAuthPanel.tsx` into a component path such as `src/components/SupabaseAuthPanel.tsx`.

The example uses:

- `getSession()` to load the initial browser session.
- `onAuthStateChange()` to keep UI state in sync.
- `signUp()` for email/password registration.
- `signInWithPassword()` for existing users.
- `signOut({ scope: "local" })` so the current browser session is signed out without unexpectedly signing out every device.

Use Supabase Auth only when Supabase is the app's user-account backend. It is separate from MISO's site access check.

## Verification

- Sign-up or sign-in returns a Supabase session or a clear Supabase Auth error.
- Refreshing the page preserves the expected session state.
- Sign out clears the visible session state.
- No backend-only Supabase key or provider secret appears in browser code.
- Redirect URL errors are fixed in the Supabase provider/dashboard settings, not by adding a custom Node server.
