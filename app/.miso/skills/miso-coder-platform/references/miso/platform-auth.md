# MISO Platform Auth Reference

Use this reference for MISO site auth: the generated website is already protected by MISO login, and the app only needs to read the current MISO user.

## Access Modes

| Published app permission | Platform behavior | Frontend pattern |
| --- | --- | --- |
| Not `external` | MISO login and app permission are checked before static site serving | Use `getMisoCurrentUser()` only when the UI needs user details |
| `external` | Static site serving bypasses MISO login and allows anonymous visitors | Use `RequireMisoLogin.tsx` only for pages/sections that should opt in to MISO login |

MISO-authenticated published sites do not need a frontend gate. External public sites can opt in to MISO login by redirecting to `/login?redirect=<published route>`.

## Official Source

- Read `src/lib/miso-sdk/miso-auth.ts` first for the exact frontend API.
- Read `src/lib/miso-sdk/site-client.ts` for how `/__api` is resolved in dev preview and published site routes.
- Published implementation is the platform `GET /site/<site_code>/__api/auth/me` route. From app code, always call it as `GET /__api/auth/me` through the SDK helper.

## Runtime Contract

`GET /__api/auth/me` returns:

```json
{
  "authenticated": true,
  "user": {
    "id": "account-id",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": null,
    "department": null
  },
  "site": { "code": "site-code" },
  "app": { "id": "app-id", "permission": "workspace" }
}
```

- Published site revalidates site access before returning this payload. It uses the same published-site gate as static serving: serving status, MISO cookies, app permission, refresh cookies, and external IP restrictions are checked by the platform.
- Preview returns the verified account id from the preview session token. Preview does not know profile fields, so `email`, `name`, `avatar`, `department`, `site.code`, and `app.permission` can be `null`.
- Anonymous or unauthorized responses should render a signed-out or restricted state; do not create a second login flow unless the user explicitly asks for app-local accounts.

## Status Code Behavior

| Response | Meaning | Correct action |
| --- | --- | --- |
| `200` with `authenticated: true` | MISO site access is valid | Render the signed-in UI |
| `200` with `authenticated: false` | Public/external site context without a user | Render a signed-out or limited UI |
| `401` | MISO login cookie is absent or invalid | Show a login-required state; do not create app-local auth |
| `403` | MISO user is signed in but lacks app/site permission | Show an access-denied state |
| HTML response | Wrong route | HTML response means the app called the wrong route; switch back to `getMisoCurrentUser()` |

For an external public route that should require MISO login, call `redirectToMisoLogin()` from `src/lib/miso-sdk/miso-auth.ts`. It builds `/login?redirect=...` from the current published route.

## Frontend Usage

```ts
import { getMisoCurrentUser } from "@/lib/miso-sdk/miso-auth";

const context = await getMisoCurrentUser();
if (context.authenticated) {
  console.log(context.user?.id);
}
```

The helper uses `getApiBase()`, so the same code works in dev and published mode:

- Dev preview: `/__api/auth/me`, rewritten by the preview proxy.
- Published: `/site/<site_code>/__api/auth/me`, resolved by `site-client.ts`.

## Do Not Use These Surfaces

- Do not use PocketBase auth when the requirement is only MISO login.
- Do not implement OAuth when the site only needs the existing MISO user.
- Do not invent a `__miso` prefix; that platform namespace does not exist for generated apps.
- Do not call raw `/api/auth/me`; Vite SPA fallback or unrelated routes can answer with HTML.
- Do not call `/ext/v1/auth/me`; `auth/me` is a platform-reserved `__api` path, not a Service API endpoint.
- Do not read or trust `x-coder-*` headers in app code or PocketBase hooks. Published site strips untrusted caller headers and injects trusted context only for platform-owned internal routes.
- Never persist this response in localStorage or use it as a bearer token substitute. It is display/session context, not a credential.
- Static route hiding is not a security boundary. Protect sensitive data at the backend/PocketBase/MISO API layer, not by hiding React components in a public bundle.

## When To Use Another Auth Recipe

- Use `recipes/pocketbase/auth/email-password/README.md` when the app needs its own account database.
- Use `recipes/pocketbase/auth/oauth-google/README.md` or `recipes/pocketbase/auth/oauth-microsoft-entra/README.md` when the app itself owns provider login through the runtime.
- Use `recipes/integrations/oauth/token-bridge/README.md` when the app receives a token from an external identity provider and must exchange it for app-local runtime auth.
