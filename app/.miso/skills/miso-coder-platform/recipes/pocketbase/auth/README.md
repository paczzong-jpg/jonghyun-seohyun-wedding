# PocketBase Auth Recipes

Use this when the generated app needs app-owned accounts stored in PocketBase: email/password login, signup, PocketBase OAuth providers, auth refresh, logout, or PocketBase auth rules.

Do not use this for MISO site login. If the user only needs the already logged-in MISO user, use `recipes/miso/auth/README.md`.

Do not use this for generic provider API access such as Gmail or Calendar. Use `recipes/integrations/...` for provider API integrations and their OAuth connection steps.

## Choose The Surface

| Feature | Use | Files |
| --- | --- | --- |
| Email/password login and signup | PocketBase built-in auth collection | `email-password/README.md`, `email-password/AuthPanel.tsx` |
| Google login for app-owned PocketBase users | PocketBase OAuth provider `google` | `oauth-google/README.md`, `oauth-google/GoogleLoginButton.tsx` |
| Microsoft Entra login for app-owned PocketBase users | PocketBase OAuth provider `microsoft` | `oauth-microsoft-entra/README.md`, `oauth-microsoft-entra/EntraLoginButton.tsx` |

## Non-Negotiable Platform Rules

- Use `src/lib/miso-sdk/runtime-client.ts` from frontend code. It already points PocketBase requests at the MISO runtime base.
- Do not create a custom Node/Express/NextAuth server. This is a Vite SPA plus PocketBase runtime.
- Configure provider client id/client secret in PocketBase auth collection options.
- Do not put OAuth client secrets in `VITE_*`.
- Register the provider redirect URI as `/api/oauth2-redirect` on the active PocketBase runtime origin; provider consoles require redirect URI must exactly match.
- Do not hardcode preview/session URLs. Let the runtime client compute the base path.

## Implementation Order

1. Confirm app-owned auth is required.
2. Confirm the auth collection name, usually `users`.
3. Confirm the required auth method is enabled in PocketBase auth collection options.
4. Copy the relevant recipe code into app-owned component files under `src/components/...`.
5. Wire the component into the existing app route or settings panel.
6. Add PocketBase API rules to protect records. UI-only checks are not authorization.
7. Run a real login flow. For OAuth, test the provider callback in the same preview/published origin that users will use.

## Diagnostics

If login fails, read `diagnostics/auth-login-or-oauth-fails.md`. Most failures are provider config, exact redirect URI mismatch, popup timing, missing auth collection settings, or a route base mismatch.
