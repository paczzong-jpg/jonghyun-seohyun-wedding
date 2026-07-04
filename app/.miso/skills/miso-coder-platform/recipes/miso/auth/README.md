# MISO Site Auth

Use this recipe when the user asks for the current MISO user, existing MISO login, "logged-in user", "my account", or access control that should rely on the MISO site login already protecting the published website.

## Platform Reality

MISO-authenticated published sites do not need a frontend gate. The platform already checks MISO login before the SPA is served, so a React guard only repeats the server decision.

External public sites can opt in to MISO login for a page or section. In that case the frontend must send the visitor to `/login?redirect=<current published route>`, then re-check `GET /__api/auth/me` after the login returns.

Static route hiding is not a security boundary. A public site still serves the same static bundle. Do not embed private data in the bundle; fetch protected data only after `getMisoCurrentUser()` confirms a MISO user, and enforce real data permissions on the backend/PocketBase/MISO API surface.

## Required Files

- `src/lib/miso-sdk/miso-auth.ts`
- `references/miso/platform-auth.md`
- `MisoAuthStatus.tsx` from this folder, copied into an app-owned component path if a visible status panel is needed
- `RequireMisoLogin.tsx` from this folder, copied into an app-owned component path if an external public page or section must send visitors to MISO login

## Decide The UI Pattern

| User asks for | Use |
| --- | --- |
| Show who is signed in | Copy `MisoAuthStatus.tsx` and render it in the page/header/settings panel |
| MISO-authenticated site wants current user display | `MisoAuthStatus.tsx` or direct `getMisoCurrentUser()`; no frontend gate needed |
| External public site has one page/section that should require MISO login | Copy `RequireMisoLogin.tsx` and wrap that section |
| Use the user id in custom logic | Call `getMisoCurrentUser()` directly |

## Direct Implementation

1. Import `getMisoCurrentUser()` from `@/lib/miso-sdk/miso-auth`.
2. Call it from React state/effect code or from an event handler that needs the current user.
3. Treat `authenticated: false` as not signed in or not allowed.
4. Use only the fields in `MisoAuthContext`: `user.id`, `user.email`, `user.name`, `user.avatar`, `user.department`, `site.code`, `app.id`, and `app.permission`.

```ts
import { getMisoCurrentUser } from "@/lib/miso-sdk/miso-auth";

const auth = await getMisoCurrentUser();
if (!auth.authenticated) {
  throw new Error("MISO login required");
}
```

The SDK calls `GET /__api/auth/me`. Published site revalidates site access before returning the user. Preview returns the verified account id from the preview session.

## Status Component Example

Copy `MisoAuthStatus.tsx` to an app-owned path such as `src/components/auth/MisoAuthStatus.tsx`, then render it from the page that needs to show the current MISO login state.

```tsx
import { MisoAuthStatus } from "@/components/auth/MisoAuthStatus";

export function AccountSummary() {
  return (
    <aside>
      <MisoAuthStatus />
    </aside>
  );
}
```

## External Public Page Requiring MISO Login

Copy `RequireMisoLogin.tsx` to an app-owned path such as `src/components/auth/RequireMisoLogin.tsx`.

```tsx
import { RequireMisoLogin } from "@/components/auth/RequireMisoLogin";

function AccountDetails() {
  return <main>Account-only content loaded after MISO login</main>;
}

export function PrivateAccountPage() {
  return (
    <RequireMisoLogin
      denied={<p role="status">MISO login required.</p>}
      error={(message) => (
        <p role="status">MISO login check failed: {message}</p>
      )}
    >
      <AccountDetails />
    </RequireMisoLogin>
  );
}
```

This component is intentionally a login redirect helper for external public sites. It does not create a login system; it redirects to MISO login and reads the verified MISO site session after the browser returns.

## Use The User In Data Logic

When a feature needs the account id for filtering client-side display, keep the call explicit:

```ts
const auth = await getMisoCurrentUser();
const accountId = auth.user?.id;

if (!auth.authenticated || !accountId) {
  return [];
}
```

Do not use this as a database authorization boundary. Server-side data access still needs the platform route, MISO Service API, or PocketBase rules appropriate to that data surface.

## Non-Negotiable Rules

- Do not use PocketBase auth when the requirement is only MISO login.
- Do not create provider login, token exchange, or runtime accounts unless the user explicitly asks for app-owned accounts.
- Do not hardcode a site code, preview session URL, app id, or file URL.
- Do not invent a `__miso` prefix, call `/api/auth/me`, or call `/ext/v1/auth/me`.
- Do not add client-side secrets or bearer headers. The platform validates the site request server-side.
- Never persist this response in localStorage, sessionStorage, IndexedDB, or a generated token cache. Re-read it from `getMisoCurrentUser()` when the page needs it.

## Verification

1. In preview, call `await getMisoCurrentUser()` from the browser console or a temporary UI and confirm `authenticated: true` with the current preview account id.
2. Render `MisoAuthStatus` and confirm the account id appears.
3. For an external public page that requires MISO login, render `RequireMisoLogin` around a test section while signed out and confirm the browser navigates to `/login?redirect=...`.
4. After login, confirm the browser returns to the same `/site/<site_code>/...` route and the wrapped section renders.
5. In published mode, open the site while signed in and confirm `/__api/auth/me` returns the MISO user fields.
6. Sign out or use an unauthorized account and confirm the app renders its signed-out or redirecting state.
7. If the route returns HTML, the app is calling the wrong path; use `getMisoCurrentUser()` instead of a hand-written URL.
