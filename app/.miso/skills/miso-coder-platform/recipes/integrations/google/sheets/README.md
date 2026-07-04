# Google Sheets Values Recipe

## When To Use

Use this when the user wants a generated MISO website app to read spreadsheet cells, append form submissions or operational rows, or update a known range in a Google Sheet after the signed-in Google user grants access.

This recipe is for user-delegated Sheets API calls. It is not MISO site auth, not PocketBase Google OAuth login, and not a background sync recipe.

MISO connector-backed Sheets behavior is currently unavailable because the MISO personal connector OAuth API has not shipped. Use this standalone recipe only when the user explicitly wants the generated app to own Google OAuth and call Sheets REST APIs outside MISO connectors.

## Official Docs To Check

- Google Identity Services token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google Account Authorization JavaScript API: https://developers.google.com/identity/oauth2/web/reference/js-reference
- Sheets API `spreadsheets.values.get`: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
- Sheets API `spreadsheets.values.append`: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
- Sheets API `spreadsheets.values.update`: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/update
- Sheets API usage limits: https://developers.google.com/workspace/sheets/api/limits

## Scope

Use `https://www.googleapis.com/auth/spreadsheets` for read/write values.

Use `https://www.googleapis.com/auth/spreadsheets.readonly` only for read-only dashboards. Do not request Drive scopes for Sheets values unless the feature also needs Drive file search, Picker, permissions, or file metadata.

## Files

Do not use MISO connector-backed behavior yet; `recipes/miso/connectors/README.md`, `MisoConnectorGate.tsx`, and `connectorAuth` are unavailable until the API OAuth rollout ships. Use the standalone files below only for an explicitly requested app-owned Google OAuth path.

Standalone fallback files:

1. Copy `../googleAccessToken.ts` to `src/lib/googleAccessToken.ts`.
2. Copy `GoogleSheetsAppender.tsx` into an app-owned component path.
3. Copy `sheets.pb.js` to `api/google-sheets.pb.js`.
4. Request `VITE_GOOGLE_CLIENT_ID` with `miso_env_vars_request` if missing.

## Flow

1. The user clicks Read, Append, or Update.
2. Browser calls `getGoogleAccessToken(GOOGLE_SHEETS_SCOPE)`.
3. Browser POSTs the token, spreadsheet ID, range, and values to `/api/google/sheets/*`.
4. PocketBase route validates the A1 range and two-dimensional values.
5. The route calls Sheets REST API through `runtimeProxy.proxyFetch`.

Do not call Sheets REST APIs directly from browser components. The local route is the production path for MISO apps.

## Supported Routes

| Route | Purpose | Google endpoint |
| --- | --- | --- |
| `POST /api/google/sheets/values/get` | Read a range | `GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}` |
| `POST /api/google/sheets/values/append` | Append rows to a logical table | `POST https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}:append` |
| `POST /api/google/sheets/values/update` | Replace values in a known range | `PUT https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}` |

## Value Rules

- `range` must be A1 notation such as `Sheet1!A1:D10` or `Responses!A:D`.
- Write payloads must use a two-dimensional `values` array: `[["name", "email"]]`, not `["name", "email"]`. The sample route accepts a flat array and wraps it into one row, but generated app code should send a 2D array directly.
- Default `valueInputOption` is `USER_ENTERED`, which lets Sheets parse dates and formulas. Use `RAW` when preserving exact strings matters.
- Default append `insertDataOption` is `INSERT_ROWS`.
- Keep batches small in app routes. The sample clamps to 500 rows, 50 columns, and 5000 characters per cell to avoid oversized request bodies.

## Google Cloud Checklist

- OAuth consent screen configured.
- Authorized JavaScript origins includes the generated site origin.
- Google Sheets API enabled.
- Test user added if consent screen is in testing mode.
- The signed-in Google user can access the target spreadsheet.

## Verification

- Browser component contains only `VITE_GOOGLE_CLIENT_ID`.
- Browser component calls `/api/google/sheets/values/*`.
- Route uses `runtimeProxy.proxyFetch`.
- Route does not log access tokens or spreadsheet values.
- Route returns Google error status and sanitized details when Sheets rejects the request.

## Common Failures

- `origin_mismatch`: fix Authorized JavaScript origins in Google Cloud.
- `insufficientPermissions`: requested token does not include `spreadsheets` or `spreadsheets.readonly`.
- API disabled wording: enable Google Sheets API for the Google Cloud project.
- `404`: wrong spreadsheet ID or the signed-in user cannot access the sheet.
- `400` range or values error: verify A1 notation, URL encoding, and 2D `values`.
