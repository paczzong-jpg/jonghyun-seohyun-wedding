# PocketBase Microsoft Entra OAuth

Use this when the app needs Microsoft Entra sign-in and PocketBase should own the app user/session.

Official docs:

- PocketBase OAuth: https://pocketbase.io/docs/authentication/
- Microsoft Entra authorization code flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- Microsoft redirect URI rules: https://learn.microsoft.com/en-us/entra/identity-platform/reply-url

## Required Provider Setup

In Microsoft Entra admin center:

1. Register an application.
2. Add the PocketBase runtime redirect URI ending in `/api/oauth2-redirect`.
3. Microsoft requires the redirect URI to exactly match one registered reply URL.
4. Configure supported account type and consent settings to match the product requirement.

In PocketBase auth collection options:

1. Enable the Microsoft OAuth2 provider.
2. Store the Entra client id/client secret in PocketBase auth collection options.
3. Do not put OAuth client secrets in `VITE_*`.

## Copy Files

Copy `EntraLoginButton.tsx` to an app-owned component path such as `src/components/auth/EntraLoginButton.tsx`.

The component uses PocketBase provider name `microsoft`:

```ts
pb.collection("users").authWithOAuth2({ provider: "microsoft" });
```

If the provider does not appear in `listAuthMethods()`, fix PocketBase provider configuration first. Do not switch to MSAL or custom token exchange unless the feature is explicitly an external token bridge.

## Verification

- `pb.collection("users").listAuthMethods()` includes the Microsoft provider.
- Clicking the button opens Microsoft login.
- The callback returns to the PocketBase `/api/oauth2-redirect` route.
- `pb.authStore.record` is populated after the popup closes.
