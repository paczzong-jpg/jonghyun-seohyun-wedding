# PocketBase Auth And OAuth

Use this reference for generated MISO website apps that need user accounts, login, OAuth, SSO, or a bridge from an external identity provider.

If the requirement is only the existing MISO site login or current MISO user, do not use this reference as the implementation path. Use `recipes/miso/auth/README.md` and `references/miso/platform-auth.md`.

Official references:

- PocketBase auth docs: https://pocketbase.io/docs/authentication/
- PocketBase JS SDK: https://github.com/pocketbase/js-sdk
- PocketBase record/token APIs: https://pocketbase.io/docs/js-records/
- Google OAuth web server docs: https://developers.google.com/identity/protocols/oauth2/web-server
- Microsoft Entra authorization code flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- Microsoft redirect URI rules: https://learn.microsoft.com/en-us/entra/identity-platform/reply-url

## MISO Runtime Shape

- Do not use PocketBase auth when the requirement is only MISO login.
- Frontend is Vite React. Use the existing `src/lib/miso-sdk/runtime-client.ts` PocketBase client.
- That client already routes through `getRuntimeBase()`, so the same code works in dev preview and published `/site/<site_code>/...` routes.
- Do not create a custom Node/Express/NextAuth server. This app is not a Next.js server runtime.
- Do not call a raw root `/api/...` path for PocketBase auth. Use the PocketBase SDK or `fetch(`${getRuntimeBase()}/api/...`)` only for custom PB routes.
- PocketBase hooks are Goja/CommonJS. They cannot use npm auth libraries, `import`, `export`, or `async`/`await`.
- External identity verification from a hook must use `proxyFetch`; do not call `$http.send()` directly.

## Built-In PocketBase Auth

PocketBase auth is stateless. A user is authenticated when a valid auth token is sent in the request. The browser SDK keeps that token in `pb.authStore`; logout is `pb.authStore.clear()`.

Use these APIs from Vite code:

```ts
import pb from "@/lib/miso-sdk/runtime-client";

await pb.collection("users").authWithPassword(email, password);
await pb.collection("users").authRefresh();
pb.authStore.clear();

const unsubscribe = pb.authStore.onChange((_token, record) => {
  console.log(record?.id);
}, true);
unsubscribe();
```

Use `authRefresh()` at app start or when a protected workflow begins. If it fails, clear the auth store and show a login state.

## OAuth Provider Setup

PocketBase OAuth is configured in PocketBase auth collection options, not in browser code.

Required setup:

1. In the provider console, create an OAuth app.
2. In PocketBase auth collection options, enable the provider and store the provider client id/client secret there.
3. Register the redirect URI as `https://<your-runtime-origin>/api/oauth2-redirect`. For local PocketBase-only testing the official docs use `http://127.0.0.1:8090/api/oauth2-redirect`; in MISO generated apps use the active runtime origin that reaches PocketBase through the platform runtime route.
4. The provider redirect URI must exactly match the value sent during OAuth. Google and Microsoft Entra both reject mismatches.

Do not put OAuth client secrets in `VITE_*`. `VITE_*` values are browser-visible. The generated app should call only:

```ts
pb.collection("users").authWithOAuth2({ provider: "google" });
pb.collection("users").authWithOAuth2({ provider: "microsoft" });
```

If the popup is blocked, check that the click handler is not using async/await before `authWithOAuth2(...)`. The PocketBase docs call this out for Safari.

Use `listAuthMethods()` when diagnosing provider configuration:

```ts
const methods = await pb.collection("users").listAuthMethods();
console.log(methods);
```

Do not use `listAuthMethods()` to invent provider names. If PocketBase was configured for Microsoft Entra through the Microsoft provider, the code path is `provider: "microsoft"`.

## External Token Bridge

Use a bridge only when the user already has a token from an identity system that is not configured as a PocketBase OAuth provider.

External token bridge is backend-only:

- Frontend collects an existing access token from the external auth flow and sends it to a custom PocketBase route.
- The route calls a trusted userinfo or introspection endpoint through `proxyFetch`.
- The route validates provider response fields such as `sub`, `email`, `email_verified`, and optional `aud`.
- The route creates or updates a PocketBase auth record and returns `record.newAuthToken()`.

Do not decode a JWT and trust it without signature validation. If the provider does not expose a trusted userinfo or introspection endpoint and you cannot validate signatures inside the supported Goja surface, stop and ask for a supported provider configuration rather than accepting an unsigned decoded token.

PocketBase JS hooks can validate PB tokens with `$app.findAuthRecordByToken(token, "auth")` and can issue auth tokens with `record.newAuthToken()`.

## Security Checklist

- OAuth client secrets live in PocketBase auth collection options or backend-only runtime env, never in browser code.
- Login UI handles failed `authRefresh()` by clearing auth state.
- Auth-sensitive records use PocketBase API rules; UI checks are not authorization.
- Bridge routes never log bearer tokens or provider secrets.
- Bridge routes do external verification before entering `$app.runInTransaction`.
- Transactions use the callback app (`txApp`/`tx`) for reads and writes.
