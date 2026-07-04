# Google Calendar Event Recipe

## When To Use

Use this when the user wants a generated MISO website app to create events on the signed-in Google user's calendar after that user clicks an authorize/create action.

This recipe is for user-delegated Calendar API writes. It is not MISO site auth and not PocketBase Google OAuth login.

MISO connector-backed Calendar behavior is currently unavailable because the MISO personal connector OAuth API has not shipped. Use this standalone recipe only when the user explicitly wants the generated app to own Google OAuth and call Calendar REST APIs outside MISO connectors.

## Official Docs To Check

- Google Identity Services token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google Account Authorization JavaScript API: https://developers.google.com/identity/oauth2/web/reference/js-reference
- Calendar create events guide: https://developers.google.com/workspace/calendar/api/guides/create-events
- Calendar `events.insert`: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert

## Scope

Use `https://www.googleapis.com/auth/calendar.events` for event creation. Use broader Calendar scopes only when the feature explicitly needs full calendar management.

## Files

Do not use MISO connector-backed behavior yet; `recipes/miso/connectors/README.md`, `MisoConnectorGate.tsx`, and `connectorAuth` are unavailable until the API OAuth rollout ships. Use the standalone files below only for an explicitly requested app-owned Google OAuth path.

Standalone fallback files:

1. Copy `../googleAccessToken.ts` to `src/lib/googleAccessToken.ts`.
2. Copy `GoogleCalendarCreator.tsx` into an app-owned component path.
3. Copy `calendar.pb.js` to `api/google-calendar.pb.js`.
4. Request `VITE_GOOGLE_CLIENT_ID` with `miso_env_vars_request` if missing.

## Flow

1. The user clicks Create event.
2. Browser calls `getGoogleAccessToken(GOOGLE_CALENDAR_EVENTS_SCOPE)`.
3. Browser POSTs the token and event fields to `/api/google/calendar/events`.
4. PocketBase route validates the fields and builds an Events resource.
5. The route calls `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events` through `proxyFetch`.

Do not call Google REST APIs directly from browser components. The local route is the production path for MISO apps.

## Event Fields

- `calendarId`: default to `primary`.
- `summary`: required.
- `startDateTime`: required ISO-like datetime string.
- `endDateTime`: required ISO-like datetime string.
- `timeZone`: default to `Asia/Seoul` or the app's selected timezone.
- `attendees`: optional email array.
- `createMeet`: optional. When true, route sends `conferenceDataVersion=1` and a `conferenceData.createRequest`.

Use `sendUpdates=all` only when invitees should receive Google Calendar notifications. If the user wants silent creation, change this intentionally and document the product behavior.

## Google Cloud Checklist

- OAuth consent screen configured.
- Authorized JavaScript origins includes the generated site origin.
- Google Calendar API enabled.
- Test user added if consent screen is in testing mode.
- The authenticated user has write access to the target calendar.

## Verification

- Browser component contains only `VITE_GOOGLE_CLIENT_ID`.
- Browser component calls `/api/google/calendar/events`.
- Route uses `runtimeProxy.proxyFetch`.
- Route does not log access tokens or event contents.
- Route returns Google error status and sanitized details when Calendar rejects the request.

## Common Failures

- `origin_mismatch`: fix Authorized JavaScript origins in Google Cloud.
- `notFound`: wrong `calendarId` or the user cannot access that calendar.
- `forbidden` or `insufficientPermissions`: requested token does not include `calendar.events`, or user lacks calendar write permission.
- API disabled wording: enable Google Calendar API for the Google Cloud project.
