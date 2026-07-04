# Auth Login Or OAuth Fails

Use this diagnostic for MISO site auth, PocketBase app auth, PocketBase OAuth provider login, SSO, or external OAuth/token bridge failures.

## First Identify The Surface

| Symptom | Most likely surface |
| --- | --- |
| `GET /__api/auth/me` returns HTML or 404 | Wrong path or SPA fallback; use `src/lib/miso-sdk/miso-auth.ts` |
| `GET /__api/auth/me` returns 401 or 403 | MISO site access denied or not signed in; do not rewrite to app-owned auth |
| Email/password returns 400 | Auth collection option or submitted fields |
| `authRefresh()` fails after reload | Expired/invalid PocketBase token |
| Provider popup does not open | Browser popup timing, often `async`/`await` in click handler |
| `redirect_uri_mismatch` or Microsoft reply URL error | Provider redirect URI must exactly match `/api/oauth2-redirect` on runtime origin |
| Provider missing in `listAuthMethods()` | PocketBase auth collection OAuth provider is not enabled/configured |
| Secret appears in browser code | Wrong env surface; OAuth/client secrets must not be in `VITE_*` |
| External bridge returns 401 | userinfo or introspection endpoint rejected token, or audience mismatch |
| `/__api/auth/connectors/*`, connector grant, connector token, or `connectorAuth` appears in generated app work | MISO personal connector OAuth is unavailable in this API rollout; do not implement this path |

## Required Checks

1. If the requested feature is existing MISO site login/current user, confirm the app uses `src/lib/miso-sdk/miso-auth.ts` and `/__api/auth/me`.
2. For MISO site auth, a 401/403 means site access or MISO login failed. Do not switch to PocketBase auth, OAuth, direct browser provider calls, or a custom `/api/auth/me` route.
3. If the feature is MISO site auth, return to `recipes/miso/auth/README.md`.
4. If the feature is user-delegated provider OAuth through MISO personal connectors, stop and report that MISO connector OAuth is unavailable in this API rollout. Do not use `miso-connectors.ts`, `/__api/auth/connectors/*`, connector grants, connector tokens, or `connectorAuth`.
5. Confirm app-owned auth is actually required before continuing with PocketBase checks.
6. If the feature is PocketBase email/password or PocketBase provider login, return to `recipes/pocketbase/auth/README.md`.
7. Confirm the app is using `src/lib/miso-sdk/runtime-client.ts`, not a raw PocketBase base URL and not a raw root `/api/...` fetch.
8. Confirm the auth collection name, usually `users`.
9. For email/password, confirm Identity/password auth is enabled in PocketBase auth collection options.
10. For PocketBase OAuth, call `pb.collection("users").listAuthMethods()` and confirm the expected provider appears.
11. For PocketBase OAuth, confirm provider client id/client secret are configured in PocketBase auth collection options.
12. For PocketBase OAuth, confirm the provider console redirect URI ends with `/api/oauth2-redirect` and uses the exact active runtime origin.
13. For Google or Microsoft Entra PocketBase OAuth, remember redirect URI must exactly match the registered value.
14. If a popup is blocked, remove `async`/`await` from the click handler before `authWithOAuth2(...)`.
15. For external OAuth/token bridge work, return to `recipes/integrations/oauth/token-bridge/README.md`.
16. For external token bridge, confirm the route calls a trusted userinfo or introspection endpoint through `proxyFetch`.
17. For external token bridge, do not decode a JWT and trust it without signature validation.

## Do Not Rewrite To These Surfaces

- Do not create a custom Node/Express/NextAuth server.
- Do not replace MISO site auth (`/__api/auth/me`) with PocketBase login or provider OAuth.
- Do not create top-level `recipes/auth` for provider integrations; PocketBase Google or Microsoft login lives under `recipes/pocketbase/auth`, and provider API integrations belong under `recipes/integrations`.
- Do not move OAuth client secrets into `VITE_*`.
- Do not switch PocketBase hook outbound calls to `$http.send()`.
- Do not bypass the MISO runtime base with hardcoded preview or pod URLs.
- Do not use MSAL for Entra when the requirement is ordinary PocketBase OAuth login. Use the PocketBase Microsoft provider first.
- Do not tell users that MISO personal connectors are available until the API OAuth rollout ships. If the user explicitly asks for standalone provider OAuth, use the standalone provider recipe and app-owned OAuth configuration instead.

## Known Good Calls

```ts
await pb.collection("users").authWithPassword(email, password);
await pb.collection("users").authRefresh();
pb.authStore.clear();
pb.authStore.onChange((_token, record) => setUser(record), true);
pb.collection("users").authWithOAuth2({ provider: "google" });
pb.collection("users").authWithOAuth2({ provider: "microsoft" });
await pb.collection("users").listAuthMethods();
```

PocketBase hook token APIs:

```js
var user = $app.findAuthRecordByToken(token, "auth");
var token = record.newAuthToken();
```

## Stop Condition

The diagnostic is complete only when a real login attempt succeeds or fails at a specific external/provider configuration boundary. Do not call the implementation complete after static code edits alone.
