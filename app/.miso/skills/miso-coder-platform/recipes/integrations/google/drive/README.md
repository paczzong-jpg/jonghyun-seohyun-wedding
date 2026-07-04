# Google Drive Files Recipe

## When To Use

Use this when the user wants a generated MISO website app to browse files visible to the app, create small text/CSV/JSON files in Google Drive, or hand a Drive file link back to the UI after the signed-in Google user grants access.

This recipe is for user-delegated Drive API calls. It is not MISO site auth, not PocketBase Google OAuth login, and not a background sync recipe.

MISO connector-backed Drive behavior is currently unavailable because the MISO personal connector OAuth API has not shipped. Use this standalone recipe only when the user explicitly wants the generated app to own Google OAuth and call Drive REST APIs outside MISO connectors.

## Official Docs To Check

- Google Identity Services token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google Account Authorization JavaScript API: https://developers.google.com/identity/oauth2/web/reference/js-reference
- Drive API `files.list`: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
- Drive search files guide: https://developers.google.com/workspace/drive/api/guides/search-files
- Drive API `files.create`: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
- Drive upload file data guide: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Drive API scopes guide: https://developers.google.com/workspace/drive/api/guides/api-specific-auth

## Scope

Default to `https://www.googleapis.com/auth/drive.file`.

Use `drive.file` for app-created files or files the user explicitly selects for the app. It is the safest default and has a simpler verification path than broad Drive scopes.

Use `https://www.googleapis.com/auth/drive.readonly` only when the product requirement is broad read/search across the user's Drive or shared drives. Do not request `https://www.googleapis.com/auth/drive` unless the user explicitly needs full Drive management and accepts Google verification/security review implications.

## Files

Do not use MISO connector-backed behavior yet; `recipes/miso/connectors/README.md`, `MisoConnectorGate.tsx`, and `connectorAuth` are unavailable until the API OAuth rollout ships. Use the standalone files below only for an explicitly requested app-owned Google OAuth path.

Standalone fallback files:

1. Copy `../googleAccessToken.ts` to `src/lib/googleAccessToken.ts`.
2. Copy `GoogleDriveFileManager.tsx` into an app-owned component path.
3. Copy `drive.pb.js` to `api/google-drive.pb.js`.
4. Request `VITE_GOOGLE_CLIENT_ID` with `miso_env_vars_request` if missing.

## Flow

1. The user clicks List or Create.
2. Browser calls `getGoogleAccessToken(GOOGLE_DRIVE_FILE_SCOPE)`.
3. Browser POSTs the token and file/search fields to `/api/google/drive/*`.
4. PocketBase route validates fields and builds the Drive request.
5. The route calls Drive REST API through `runtimeProxy.proxyFetch`.

Do not call Drive REST APIs directly from browser components. The local route is the production path for MISO apps.

## Supported Routes

| Route | Purpose | Google endpoint |
| --- | --- | --- |
| `POST /api/google/drive/files/list` | List app-visible files with optional name/fullText search, MIME filter, parent folder, pagination | `GET https://www.googleapis.com/drive/v3/files` |
| `POST /api/google/drive/files/create-text` | Create a small text, CSV, JSON, or HTML file with metadata and content in one request | `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` |

The create route intentionally handles small text-like files only. For user-uploaded binary files, use the platform binary/file recipe first and then add a dedicated Drive upload route with explicit size limits.

## Drive Query Rules

- Default query includes `trashed = false`.
- Build queries from structured fields (`searchText`, `mimeType`, `parentId`) instead of concatenating user input.
- Escape apostrophes and backslashes before placing text in Drive query strings.
- Request only necessary `fields`; the sample returns `id`, `name`, `mimeType`, `webViewLink`, `iconLink`, `modifiedTime`, `size`, and `nextPageToken`.
- Avoid `allDrives` unless the user explicitly needs shared drive search. Large broad searches can be incomplete; narrow to `user` or a specific shared drive where possible.

## Google Cloud Checklist

- OAuth consent screen configured.
- Authorized JavaScript origins includes the generated site origin.
- Google Drive API enabled.
- Test user added if consent screen is in testing mode.
- Scope matches the product requirement:
  - `drive.file` for app-created/selected files.
  - `drive.readonly` for broad read-only search.

## Verification

- Browser component contains only `VITE_GOOGLE_CLIENT_ID`.
- Browser component calls `/api/google/drive/files/list` or `/api/google/drive/files/create-text`.
- Route uses `runtimeProxy.proxyFetch`.
- Route does not log access tokens or file contents.
- Route returns Google error status and sanitized details when Drive rejects the request.

## Common Failures

- Empty file list with `drive.file`: the app can only see app-created or user-selected files. Use Picker or an explicit broader read scope if needed.
- `origin_mismatch`: fix Authorized JavaScript origins in Google Cloud.
- `insufficientPermissions`: requested token does not include the Drive scope required by the route.
- API disabled wording: enable Google Drive API for the Google Cloud project.
- `400 invalidQuery`: fix the structured query fields or escaping; do not paste raw user text into `q`.
