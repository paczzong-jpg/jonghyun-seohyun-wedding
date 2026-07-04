# Google Integration Recipe

## Recipe Boundaries

Google is an external integration recipe, not MISO auth and not PocketBase OAuth login. Use this recipe when the user wants to call Google APIs such as Drive, Sheets, BigQuery, Gmail, or Calendar from a generated MISO website app.

Use `recipes/pocketbase/auth/oauth-google/README.md` only when the feature is "log in to this app with Google through PocketBase Auth." Drive, Sheets, BigQuery, Gmail, Calendar, and similar Google product APIs belong under `recipes/integrations/google/*`.

Do not create `references/google/*` for this platform skill. Google is not a MISO internal runtime surface. Use official Google docs for API behavior, and use this recipe for MISO-specific implementation boundaries.

## Current MISO Connector Limitation

MISO personal connector OAuth is currently unavailable in the API rollout. Do not use `recipes/miso/connectors/README.md`, `src/lib/miso-sdk/miso-connectors.ts`, `/__api/auth/connectors/*`, connector grants, connector tokens, or `connectorAuth` for Google features in generated app work.

Use the standalone Google OAuth token model below only when the user explicitly asks the generated app to own its Google OAuth client and direct Google REST calls outside MISO connectors.

## Official Docs To Check

- Google Identity Services overview: https://developers.google.com/identity/oauth2/web/guides/overview
- Token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- JavaScript API reference: https://developers.google.com/identity/oauth2/web/reference/js-reference
- Google OAuth web server flow, for future offline/background work: https://developers.google.com/identity/protocols/oauth2/web-server
- Drive API `files.list`: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
- Drive search files guide: https://developers.google.com/workspace/drive/api/guides/search-files
- Drive API `files.create`: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
- Drive upload file data guide: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Drive API scopes guide: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Sheets API `spreadsheets.values.get`: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
- Sheets API `spreadsheets.values.append`: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
- Sheets API `spreadsheets.values.update`: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/update
- BigQuery `jobs.query`: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
- BigQuery `jobs.getQueryResults`: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/getQueryResults
- Gmail send guide: https://developers.google.com/workspace/gmail/api/guides/sending
- Gmail `users.messages.send`: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
- Calendar create events guide: https://developers.google.com/workspace/calendar/api/guides/create-events
- Calendar `events.insert`: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert

## Default Architecture

| Need | Read | Surface | Credential class |
| --- | --- | --- | --- |
| User asks for MISO-backed Drive, Sheets, Gmail, or Calendar through personal connectors | Do not implement yet | MISO connector OAuth API is not available in this rollout | unavailable |
| User browses or creates Drive files with app-owned Google OAuth | `drive/README.md` | Standalone: browser obtains short-lived Google access token; PocketBase route lists or creates files with `proxyFetch` | public OAuth client ID plus user access token |
| User reads, appends, or updates Sheets values with app-owned Google OAuth | `sheets/README.md` | Standalone: browser obtains short-lived Google access token; PocketBase route calls Sheets Values API with `proxyFetch` | public OAuth client ID plus user access token |
| User runs BigQuery read queries | `bigquery/README.md` | Browser obtains short-lived Google access token; PocketBase route calls BigQuery Jobs API with `proxyFetch` | public OAuth client ID plus user access token |
| User clicks a button to send Gmail with app-owned Google OAuth | `gmail/README.md` | Standalone: browser obtains short-lived Google access token; PocketBase route sends mail with `proxyFetch` | public OAuth client ID plus user access token |
| User clicks a button to create Calendar event with app-owned Google OAuth | `calendar/README.md` | Standalone: browser obtains short-lived Google access token; PocketBase route inserts event with `proxyFetch` | public OAuth client ID plus user access token |
| Background sync, scheduled send, or offline access | Do not improvise from this recipe | Needs a separate authorization-code-flow recipe and token storage design | backend client secret plus refresh token storage |

The standalone fallback uses Google Identity Services token model:

1. Browser loads `https://accounts.google.com/gsi/client`.
2. Browser calls `google.accounts.oauth2.initTokenClient`.
3. User grants the exact Google API scopes from a user gesture.
4. Browser sends the short-lived access token to an app-owned PocketBase route.
5. PocketBase route calls the Google REST API through `proxyFetch`.

Do not call Google REST APIs directly from browser components. MISO platform outbound access should stay behind the PocketBase route so diagnostics, proxy behavior, and error handling match production.

Do not request or store `GOOGLE_CLIENT_SECRET` for the token model. A client secret is only for an authorization-code-flow backend that intentionally stores refresh tokens; that is a different recipe and needs explicit storage, rotation, and revocation handling.

## Env Request

Only request the browser OAuth client ID when the user explicitly chooses standalone Google OAuth/API. Do not request it for unavailable MISO connector-backed features.

Standalone fallback env request:

```ts
{
  title: "Connect Google APIs",
  description: "Enter the Google OAuth Web client ID for browser consent.",
  variables: [
    { key: "VITE_GOOGLE_CLIENT_ID", target: "frontend", secret: false, required: true }
  ]
}
```

Use `miso_env_vars_request`; do not ask the user to paste client IDs or secrets into chat. `VITE_GOOGLE_CLIENT_ID` is public browser configuration. It is not a secret.

## Google Cloud Setup Checklist

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen. Add test users while the app is in testing mode.
3. Create an OAuth 2.0 Client ID with application type "Web application".
4. Add the generated website app origin to Authorized JavaScript origins. Use the exact scheme, host, and port/domain shown to users.
5. Enable the product API before testing:
   - Google Drive API for Drive file search or creation.
   - Google Sheets API for spreadsheet values.
   - BigQuery API for BigQuery jobs.
   - Gmail API for Gmail send.
   - Google Calendar API for Calendar events.
6. Use the narrowest scopes:
   - Drive app-created or user-selected files: `https://www.googleapis.com/auth/drive.file`.
   - Drive broad read search only when explicitly required: `https://www.googleapis.com/auth/drive.readonly`.
   - Sheets read/write values: `https://www.googleapis.com/auth/spreadsheets`.
   - Sheets read-only dashboards: `https://www.googleapis.com/auth/spreadsheets.readonly`.
   - BigQuery queries: `https://www.googleapis.com/auth/bigquery`.
   - BigQuery read-only queries where IAM permits them: `https://www.googleapis.com/auth/bigquery.readonly`.
   - Gmail send: `https://www.googleapis.com/auth/gmail.send`.
   - Calendar event creation: `https://www.googleapis.com/auth/calendar.events`.

If Google returns `origin_mismatch`, fix Authorized JavaScript origins in Google Cloud, not app code. If Google returns `insufficientPermissions`, request the missing scope again from a user click and verify the API is enabled.

## Preview And Published Origins

The default Google Identity Services token model does not use redirect URIs. It uses the browser origin registered under Authorized JavaScript origins.

Register both origins in the Google Cloud OAuth client:

```text
preview origin:
https://<miso-origin>

published origin:
https://<miso-origin>
```

The origin is scheme plus host plus optional port only; do not include `/service/coder/preview/<app_id>` or `/site/<site_code>` in Authorized JavaScript origins. The `site_code` is unknown during development, so test in preview with the preview origin and tell the user to add the published URL or verify the published origin after publishing if their MISO deployment uses a different public host.

Do not use `/__external/...`, `/site/<site_code>/__external/...`, or the internal `browser-proxy` route for Google authorization setup. `browser-proxy` is an outbound proxy for external HTTP requests, not a redirect URI.

## Files To Copy

- For standalone fallback, copy `googleAccessToken.ts` to `src/lib/googleAccessToken.ts`.
- Copy the selected component snippet into an app-owned component file.
- Copy the selected `*.pb.js` route into `api/`.

## Verification

- No generated app code uses `miso-connectors.ts`, `/__api/auth/connectors/*`, connector grants, connector tokens, or `connectorAuth` while MISO connector OAuth is unavailable.
- Standalone fallback env value was collected with `miso_env_vars_request`.
- Browser files contain `VITE_GOOGLE_CLIENT_ID` only, never `GOOGLE_CLIENT_SECRET`.
- Browser components call local `/api/google/*` routes, not `https://www.googleapis.com/*`, `https://sheets.googleapis.com/*`, or `https://gmail.googleapis.com/*`.
- PocketBase route loads without syntax errors.
- PocketBase route uses `runtimeProxy.proxyFetch`, not `$http.send`.
- Route response forwards Google status and sanitized error body.
- Google Cloud has the exact JavaScript origin and enabled APIs for the selected recipe.

## Common Wrong Paths

- Putting Drive/Sheets/Gmail/Calendar under `recipes/auth`.
- Using PocketBase Google OAuth login as if it grants Google Workspace API scopes. It logs users into the app; it is not this API integration.
- Asking for `GOOGLE_CLIENT_SECRET` for a click-driven browser flow.
- Storing short-lived access tokens in PocketBase records.
- Calling Google APIs from the sandbox shell to test network behavior.
- Calling Google REST APIs directly from browser components and then debugging CORS instead of using the route.
- Requesting broad `drive` scope by default. Prefer `drive.file`; use `drive.readonly` only for explicit broad read/search features.
