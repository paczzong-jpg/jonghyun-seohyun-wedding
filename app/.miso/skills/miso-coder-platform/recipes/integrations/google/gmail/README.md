# Gmail Send Recipe

## When To Use

Use this when the user wants a generated MISO website app to send email from the signed-in Google user's Gmail account after that user clicks an authorize/send action.

Use another provider recipe for transactional mail sent from the app's own mailbox. Gmail user send is consented user data access and requires Google OAuth consent.

MISO connector-backed Gmail behavior is currently unavailable because the MISO personal connector OAuth API has not shipped. Use this standalone recipe only when the user explicitly wants the generated app to own Google OAuth and call Gmail REST APIs outside MISO connectors.

## Official Docs To Check

- Google Identity Services token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google Account Authorization JavaScript API: https://developers.google.com/identity/oauth2/web/reference/js-reference
- Gmail send guide: https://developers.google.com/workspace/gmail/api/guides/sending
- Gmail `users.messages.send`: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send

## Scope

Use `https://www.googleapis.com/auth/gmail.send`. Do not ask for broader Gmail scopes unless the feature needs read, modify, or mailbox management behavior.

## Files

Do not use MISO connector-backed behavior yet; `recipes/miso/connectors/README.md`, `MisoConnectorGate.tsx`, and `connectorAuth` are unavailable until the API OAuth rollout ships. Use the standalone files below only for an explicitly requested app-owned Google OAuth path.

Standalone fallback files:

1. Copy `../googleAccessToken.ts` to `src/lib/googleAccessToken.ts`.
2. Copy `GoogleGmailSender.tsx` into an app-owned component path.
3. Copy `gmail.pb.js` to `api/google-gmail.pb.js`.
4. Request `VITE_GOOGLE_CLIENT_ID` with `miso_env_vars_request` if missing.

## Flow

1. The user clicks Send.
2. Browser calls `getGoogleAccessToken(GOOGLE_GMAIL_SEND_SCOPE)`.
3. Browser POSTs the token and mail fields to `/api/google/gmail/send`.
4. The PocketBase route builds an RFC 2822 MIME message and base64url encodes it in `raw`.
5. The route calls `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` through `proxyFetch`.

Do not call Google REST APIs directly from browser components. The local route is the production path for MISO apps.

## Google Cloud Checklist

- OAuth consent screen configured.
- Authorized JavaScript origins includes the generated site origin.
- Gmail API enabled.
- Test user added if consent screen is in testing mode.
- App verification handled before requesting sensitive/restricted scopes from broad users.

## Verification

- Browser component contains only `VITE_GOOGLE_CLIENT_ID`.
- Browser component calls `/api/google/gmail/send`.
- Route uses `runtimeProxy.proxyFetch`.
- Route does not log access tokens or message contents.
- Route returns Google error status and sanitized details when Gmail rejects the request.

## Common Failures

- `origin_mismatch`: fix Authorized JavaScript origins in Google Cloud.
- `access_denied`: user denied consent; show retry UI from a user click.
- `insufficientPermissions`: requested token does not include `gmail.send`; request the Gmail send scope again.
- `403` with API disabled wording: enable Gmail API for the Google Cloud project.
