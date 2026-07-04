# MISO Personal Connectors

## Current Availability

MISO personal connector OAuth is currently unavailable in the API rollout. Do not implement this recipe in generated app work until the restriction is explicitly removed.

Do not use `src/lib/miso-sdk/miso-connectors.ts`, `/__api/auth/connectors/*`, `createMisoConnectorGrant`, `fetchMisoConnectorAccessToken`, connector grants, connector tokens, or `runtimeProxy.proxyFetch({ connectorAuth })`.

If a user asks for user-delegated provider access, report that MISO connector OAuth is not available yet. Use standalone provider OAuth/API recipes only when the user explicitly asks for that non-MISO-connector path and accepts app-owned OAuth configuration.

The rest of this document is retained as future reference only. Do not copy or implement the examples below while connector OAuth is unavailable.

When this restriction is removed, this recipe is for generated website apps that need the current user to connect a personal provider account such as Google Workspace, Microsoft 365, Notion, Slack, or another MISO connector.

When available, this is the default path for user-delegated provider OAuth in MISO website apps. While unavailable, do not replace it with Google Identity Services, Microsoft MSAL, `passport-deployed`, `X-App-Code`, or `X-Miso-Chat-Token` unless the user explicitly asks for standalone provider OAuth outside MISO connectors.

## Runtime Contract

When this restriction is removed, generated Vite code calls one stable app-local surface:

```text
GET  /__api/auth/connectors/status
GET  /__api/auth/connectors/<connector>/authorize
POST /__api/auth/connectors/<connector>/disconnect
POST /__api/auth/connectors/<connector>/grant
POST /__api/auth/connectors/<connector>/token
```

In coder preview this remains `/__api/...`; Session Manager routes connector calls to the MISO connector API before the generic app-token proxy. After publish, `site-client.ts` maps the same helper calls to `/site/<site_code>/__api/...`.

Flask owns the identity split:

- Logged-in MISO user: the site proxy uses the MISO account as the connector subject.
- External anonymous visitor: the site proxy creates a site-scoped HttpOnly visitor cookie and uses that `end_user` as the connector subject.
- Generated app code does not store or forward MISO chat tokens.
- PocketBase broker routes use a short-lived connector grant. They do not receive refresh tokens, client secrets, OAuth client IDs, or token URLs.

The provider callback is always the canonical platform callback:

```text
https://api.<customer-domain>/api/auth/connectors/callback
```

The actual URL is displayed in Admin V2 personal connector OAuth settings. Do not hardcode `<SERVICE_API_URL>`, preview URLs, or `/site/<site_code>` callback URLs for MISO personal connectors.

## Future Files

- Use these files only after the connector OAuth restriction is explicitly removed.
- Then use `src/lib/miso-sdk/miso-connectors.ts`.
- Then copy `MisoConnectorGate.tsx` from this folder when the app needs a ready-made connection gate.
- Keep provider-specific request shapes in the provider recipe, and use the bridge in this recipe for credentials.

## Example

```tsx
import { useMisoExternalConnectors } from "@/lib/miso-sdk/miso-connectors";

export function GoogleConnectButton() {
  const { connectors, missing, initialized, loading, error, connect } = useMisoExternalConnectors();
  const google = connectors.find((connector) => connector.connectorId === "google");
  const googleMissing = missing.find((connector) => connector.connectorId === "google");

  if (initialized && !google) {
    return <p role="alert">Google connector is not available in this environment.</p>;
  }

  if (google && !googleMissing) {
    return <span>Google connected</span>;
  }

  return (
    <div>
      <button type="button" disabled={loading} onClick={() => connect("google")}>
        Connect Google
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
```

Future behavior: after the connector is connected, the credential bridge below is the path for provider API calls owned by the website app. Do not apply this while connector OAuth is unavailable.

## Future: Calling Provider APIs From A PocketBase Broker Route

When this restriction is removed, use this path when the website app needs to call a provider REST API using the connected user's account. The frontend creates a grant, sends the grant to an app-owned PocketBase route, and the route calls the provider through `proxyFetch({ connectorAuth })`.

Frontend:

```tsx
import { createMisoConnectorGrant } from "@/lib/miso-sdk/miso-connectors";
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

const GOOGLE_DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export async function listGoogleDriveFiles() {
  const grant = await createMisoConnectorGrant("google", {
    scope: GOOGLE_DRIVE_READONLY_SCOPE,
    audience: "pocketbase",
  });

  const response = await fetch(`${getRuntimeBase()}/api/google/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant: grant.grant }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}
```

PocketBase route:

```js
// api/google.pb.js
routerAdd("POST", "/api/google/files", function (e) {
  var runtimeProxy = require(`${__hooks}/_runtime_proxy.js`);
  var GOOGLE_DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

  function bytesToUtf8(bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; ) {
      var c = bytes[i++] & 255;
      if (c < 128) {
        out += String.fromCharCode(c);
      } else if (c >= 192 && c < 224 && i < bytes.length) {
        var c2 = bytes[i++] & 255;
        out += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      } else if (c >= 224 && c < 240 && i + 1 < bytes.length) {
        var c3 = bytes[i++] & 255;
        var c4 = bytes[i++] & 255;
        out += String.fromCharCode(((c & 15) << 12) | ((c3 & 63) << 6) | (c4 & 63));
      } else if (c >= 240 && c < 248 && i + 2 < bytes.length) {
        var c5 = bytes[i++] & 255;
        var c6 = bytes[i++] & 255;
        var c7 = bytes[i++] & 255;
        var point = ((c & 7) << 18) | ((c5 & 63) << 12) | ((c6 & 63) << 6) | (c7 & 63);
        point -= 65536;
        out += String.fromCharCode(55296 + (point >> 10), 56320 + (point & 1023));
      } else {
        out += String.fromCharCode(65533);
      }
    }
    return out;
  }

  function bodyToText(res) {
    if (typeof res.text === "string") return res.text;
    var body = res && res.body;
    if (typeof body === "string") return body;
    return bytesToUtf8(body || []);
  }

  function parseJson(text) {
    try {
      return JSON.parse(text || "{}");
    } catch (err) {
      return { raw: text };
    }
  }

  var info = e.requestInfo();
  var body = info.body || {};
  var grant = body.grant || "";
  if (!grant) {
    return e.json(400, { message: "connector grant is required" });
  }

  var providerRes = runtimeProxy.proxyFetch({
    url: "https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType)",
    method: "GET",
    headers: { Accept: "application/json" },
    connectorAuth: {
      connector: "google",
      grant: grant,
      scope: GOOGLE_DRIVE_READONLY_SCOPE,
      audience: "pocketbase",
    },
    timeout: 30,
  });

  var statusCode = providerRes.statusCode || 200;
  var responseText = bodyToText(providerRes);
  if (statusCode < 200 || statusCode >= 300) {
    return e.json(statusCode, {
      message: "Google Drive request failed",
      details: parseJson(responseText),
    });
  }
  return e.json(200, parseJson(responseText));
});
```

Future rules:

- Do not set `Authorization` in the `proxyFetch` config when `connectorAuth` is present. Session Manager injects it after resolving the grant.
- Browser code calls MISO connector control-plane APIs through `miso-connectors.ts`; that SDK uses `getApiBase()` internally for `/__api/auth/connectors/*`.
- Browser code calls app-owned PocketBase broker routes through `getRuntimeBase()`. Do not call app-owned PB routes with raw `/api/...`; in coder preview that path hits the Vite/preview surface instead of PocketBase.
- Do not call `fetchMisoConnectorAccessToken()` from a PocketBase route. PB routes use `connectorAuth`.
- Do not store access tokens in PocketBase records.
- Request a new grant for each user action or retry; grants are short-lived and one-time use. Do not reuse the same grant across multiple PB calls, parallel requests, polling loops, or retries. A consumed grant fails later as `Connector grant is expired or already used`.
- Treat the bridge as `one frontend action creates one grant, one backend call consumes one grant`. If the backend has to retry the provider call, return a retryable error to the frontend and let the frontend request a fresh grant.
- Use the same `scope` and `audience` when creating the grant and when resolving it through `connectorAuth`. If the connected provider account did not grant that scope, MISO rejects the grant instead of letting the provider call fail later.
- For provider APIs with separate permission surfaces, declare one constant per operation and pass it to both sides. Examples: Drive read uses `https://www.googleapis.com/auth/drive.readonly`, Sheets read/write uses `https://www.googleapis.com/auth/spreadsheets`, Gmail list/read uses `https://www.googleapis.com/auth/gmail.readonly`, and Calendar list/read uses `https://www.googleapis.com/auth/calendar.readonly`.
- Do not omit `scope` just because the connector is already connected. An omitted scope can hide missing consent until the provider API call returns a later 401/403.
- Decode `proxyFetch` text responses with a UTF-8 byte decoder before `JSON.parse`. Do not convert each byte with a byte-wise `String.fromCharCode` loop; Korean provider fields such as Gmail subjects, Drive filenames, Sheet values, Notion titles, and Slack text become mojibake.

## Frontend Direct Token Exception

When this restriction is removed, use `fetchMisoConnectorAccessToken()` only when a browser SDK or provider endpoint must run in the browser. Prefer the PocketBase broker route above for ordinary REST calls.

```ts
import {
  createMisoConnectorGrant,
  fetchMisoConnectorAccessToken,
} from "@/lib/miso-sdk/miso-connectors";

const grant = await createMisoConnectorGrant("google", {
  scope: "https://www.googleapis.com/auth/drive.readonly",
  audience: "browser",
});
const token = await fetchMisoConnectorAccessToken("google", grant.grant, {
  scope: "https://www.googleapis.com/auth/drive.readonly",
  audience: "browser",
});
```

The token response is access-token-only. It does not include refresh token, client secret, client ID, or token URL. Never persist it.
The frontend direct-token path still consumes a one-time grant. Do not call `fetchMisoConnectorAccessToken()` twice with the same grant, and do not cache the returned access token beyond the immediate browser SDK/API operation.

## Future Admin Setup

When this restriction is removed, before this works in a deployed website:

1. Admin V2 configures the connector OAuth app if the provider requires BYOA.
2. Provider console registers the callback URL shown by Admin V2 personal connector settings.
3. The target connector is platform-enabled and has the required OAuth client settings. Website apps can request connector tokens by connector name even when the Admin V2 personal connector exposure toggle is off or the connector is hidden from the end-user tool list.
4. For external/public visitors, the app is published with external delegated OAuth enabled.

## Future Verification

- Browser code imports `miso-connectors.ts`; it does not reference `passport-deployed`, `X-App-Code`, `X-Miso-Chat-Token`, provider client secrets, or provider access tokens.
- Network calls go to `/__api/auth/connectors/*` in preview and `/site/<site_code>/__api/auth/connectors/*` after publish.
- Login users and external users use the same frontend route; the server chooses account vs end_user.
- OAuth popup posts `connector_oauth_complete`; the hook refetches status.
- PocketBase provider calls use `runtimeProxy.proxyFetch({ connectorAuth: ... })`, not `$http.send` and not browser direct provider REST calls.
- Frontend calls to app-owned PocketBase broker routes use `getRuntimeBase()`, not raw `/api/...`.
- Grant creation and PB `connectorAuth` resolution use the same `scope` and `audience`; requested scopes are already granted by the connector connection.
- Token/grant code does not ask the user for provider client IDs when MISO-managed connector clients are available.
- If status is empty, confirm the target connector is platform-enabled for this environment and has required OAuth client settings. Do not diagnose website OAuth failures from the Admin V2 personal connector exposure toggle alone; that toggle controls tool-list visibility, not the website `__api/auth/connectors/*` token bridge.

## Standalone OAuth Exception

Use provider recipes such as `recipes/integrations/google/README.md` only when the user explicitly wants the generated app to own the provider OAuth client and provider REST calls. That path requires provider-specific client IDs, redirect/origin setup, scopes, and runtime routes.
