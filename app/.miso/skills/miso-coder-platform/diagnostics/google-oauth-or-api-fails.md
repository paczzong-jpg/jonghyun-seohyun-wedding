# Google OAuth Or API Fails

## Symptoms

- Google consent popup does not open.
- Google returns `origin_mismatch`, `access_denied`, or `popup_closed`.
- Gmail or Calendar route returns 401, 403, `insufficientPermissions`, `notFound`, or API disabled details.
- Browser component works until the local `/api/google/*` route calls Google.

## Common Wrong Diagnosis

Treating Gmail or Calendar as PocketBase Google OAuth login. PocketBase Google OAuth authenticates the app user; it does not grant Gmail or Calendar API access.

Another wrong diagnosis is assuming MISO personal connectors are currently available. MISO connector OAuth is not available in this API rollout, so generated apps must not use `miso-connectors.ts`, `/__api/auth/connectors/*`, connector grants, connector tokens, or `connectorAuth`.

## First Checks

1. If the feature is MISO connector-backed, stop and report that MISO connector OAuth is unavailable in this API rollout.
2. For an explicitly requested standalone Google OAuth/API path, confirm `VITE_GOOGLE_CLIENT_ID` was saved through `miso_env_vars_request` with `target: "frontend"` and `secret: false`.
3. For standalone Google OAuth/API, confirm the Google Cloud OAuth consent screen is configured and the active user is allowed while the app is in testing mode.
4. For standalone Google OAuth/API, confirm Authorized JavaScript origins contains the exact generated site origin.
5. Confirm the product API is enabled when direct Google REST calls are used:
   - Gmail API enabled for Gmail send.
   - Google Calendar API enabled for Calendar events.
6. Confirm the requested scope matches the route:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/calendar.events`
7. Confirm standalone PocketBase routes use `proxyFetch` and not `$http.send`.

## Commands Or Files To Inspect

- `recipes/integrations/google/README.md`
- `recipes/integrations/google/gmail/README.md`
- `recipes/integrations/google/calendar/README.md`
- `recipes/miso/env-secrets/README.md`
- `api/google-*.pb.js` for standalone fallback
- Browser network response for `/api/google/*`
- PocketBase route logs, without printing tokens

## Commands Or Files Not To Use

- `recipes/auth/*`
- `recipes/pocketbase/auth/oauth-google/*` unless the user asked for app login.
- Direct Google REST calls from browser components.
- `passport-deployed`, `X-App-Code`, or `X-Miso-Chat-Token` in generated app code.
- Direct `$http.send()` in hooks.
- Secret logging or access-token logging.
- Sandbox shell network probes.

## Decision Tree

- Standalone fallback `VITE_GOOGLE_CLIENT_ID` missing: request it with `miso_env_vars_request`.
- MISO connector-backed code or `/__api/auth/connectors/*` usage exists: remove it or stop implementation; connector OAuth is unavailable.
- PB route uses `connectorAuth`: remove it or stop implementation; connector grants and tokens are unavailable.
- Popup blocked or closed: call `getGoogleAccessToken()` from a user click handler.
- `origin_mismatch`: fix Authorized JavaScript origins in Google Cloud.
- `access_denied`: user denied consent; keep retry UI user-driven.
- `insufficientPermissions`: request the exact Gmail or Calendar scope again.
- API disabled: enable Gmail API or Google Calendar API in the same Google Cloud project as the OAuth client.
- `notFound` from Calendar: verify `calendarId` and user write access.
- 401 from route: token expired; request a fresh token from a user click.
- CORS-like browser error: browser should call `/api/google/*`; route should call Google through `proxyFetch`.

## Fix Path

Patch the selected Google integration recipe surface:

- Standalone browser helper obtains a fresh short-lived access token with Google Identity Services only when the user explicitly requested app-owned Google OAuth/API.
- Route returns status and sanitized error details.

## Verification

- No browser file contains `GOOGLE_CLIENT_SECRET`.
- No route logs access tokens.
- Browser component calls `/api/google/gmail/send` or `/api/google/calendar/events`.
- No generated app code uses `miso-connectors.ts`, `/__api/auth/connectors/*`, connector grants, connector tokens, or `connectorAuth`.
- Standalone fallback route calls Google with `Authorization: Bearer <token>` through `proxyFetch`.
- Google Cloud origin, API enablement, scopes, and consent user settings match the selected recipe.

## Return To Recipe

Return to `recipes/integrations/google/README.md` and then the selected Gmail or Calendar subrecipe.
