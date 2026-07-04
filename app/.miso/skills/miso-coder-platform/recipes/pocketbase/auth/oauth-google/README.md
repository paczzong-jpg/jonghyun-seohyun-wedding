# PocketBase Google OAuth

Use this when the app needs "Sign in with Google" and PocketBase should own the user record/session.

Official docs:

- PocketBase OAuth: https://pocketbase.io/docs/authentication/
- Google OAuth web server apps: https://developers.google.com/identity/protocols/oauth2/web-server

## Required Provider Setup

In Google Cloud Console:

1. Create an OAuth web application.
2. Add the PocketBase runtime redirect URI ending in `/api/oauth2-redirect`.
3. The redirect URI must exactly match the runtime origin and path used by PocketBase.

In PocketBase auth collection options:

1. Enable OAuth2 provider `google`.
2. Store the Google client id/client secret in PocketBase auth collection options.
3. Do not put OAuth client secrets in `VITE_*`.

## Copy Files

Copy `GoogleLoginButton.tsx` to an app-owned component path such as `src/components/auth/GoogleLoginButton.tsx`.

The click handler intentionally is not marked with async/await. PocketBase notes that Safari can block the OAuth popup when the handler uses async/await before the popup opens.

## Verification

- `pb.collection("users").listAuthMethods()` includes the Google provider.
- Clicking the button opens the provider popup.
- The popup closes and `pb.authStore.record` is populated.
- Logout calls `pb.authStore.clear()`.
