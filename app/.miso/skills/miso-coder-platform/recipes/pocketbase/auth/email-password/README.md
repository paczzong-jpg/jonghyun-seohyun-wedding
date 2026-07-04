# PocketBase Email Password Auth

Use this when the app needs normal account signup, login, logout, and session refresh with a PocketBase auth collection.

Official docs:

- https://pocketbase.io/docs/authentication/
- https://github.com/pocketbase/js-sdk

## Required PocketBase Setup

In PocketBase auth collection options:

- Auth collection exists, usually `users`.
- Identity/password auth is enabled.
- Email/password policy matches the UI copy.
- Record API rules protect app data with `@request.auth.id`.

Do not build a separate backend login route for this case. The PocketBase SDK already sends auth requests to the MISO runtime through `src/lib/miso-sdk/runtime-client.ts`.

## Copy Files

1. Copy `AuthPanel.tsx` to an app-owned component path such as `src/components/auth/AuthPanel.tsx`.
2. Import and render it from the page that should own login.
3. If the collection is not `users`, change `AUTH_COLLECTION`.

## Working Pattern

The component uses:

- `pb.collection(AUTH_COLLECTION).create(...)` for signup.
- `pb.collection(AUTH_COLLECTION).authWithPassword(...)` for login.
- `pb.collection(AUTH_COLLECTION).authRefresh()` for token verification/refresh.
- `pb.authStore.onChange(...)` for UI state.
- `pb.authStore.clear()` for logout.

If `authRefresh()` fails, clear the store and show the login form. Do not keep rendering a stale user.
