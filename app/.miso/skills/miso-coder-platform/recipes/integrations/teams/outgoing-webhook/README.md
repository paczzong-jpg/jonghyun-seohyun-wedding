# Teams Outgoing Webhook

Use this recipe when Teams users should `@mention` a Teams outgoing webhook and receive a synchronous response from a generated MISO website app.

## Official Docs To Check

- Create Teams outgoing webhook: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-outgoing-webhook
- Teams webhooks and connectors: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/what-are-webhooks-and-connectors

## MISO Route

Register the Teams outgoing webhook callback URL:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/teams/outgoing-webhook
```

The app must be published and external/public unless Teams can send MISO cookies. If MISO IP restriction is enabled, allow Microsoft/Teams source IPs or Teams receives `403` before PocketBase logs.

## Env Request

Teams gives an HMAC security token when the outgoing webhook is created. That value is a base64-encoded HMAC key. PocketBase must verify it locally, so do not request it as `secret: true`.

```ts
{
  title: "Connect Teams outgoing webhook",
  description: "Enter the Teams outgoing webhook HMAC security token for local verification.",
  variables: [
    { key: "TEAMS_OUTGOING_WEBHOOK_HMAC_KEY_RAW", label: "Teams outgoing webhook HMAC token", target: "backend", secret: false, required: true }
  ]
}
```

Current MISO `secret: true` backend env values are managed placeholders inside PocketBase and only become real values during outbound `proxyFetch`; they cannot be used for this local HMAC comparison.

## Verification Algorithm

Teams sends an `Authorization` header like:

```text
HMAC <base64-hmac-digest>
```

Validate it with the exact raw request body:

1. Read `rawBody = readerToString(e.request.body)` before parsing.
2. Base64-decode `TEAMS_OUTGOING_WEBHOOK_HMAC_KEY_RAW` to key bytes.
3. Compute HMAC-SHA256 over the UTF-8 raw body bytes.
4. Base64-encode the digest.
5. Constant-time compare it with the header parameter.

This differs from Slack/GitHub/Stripe because Teams uses a base64 key and base64 digest, not a hex digest.

## Implementation

Copy `teams-outgoing-webhook.pb.js` to `api/teams-outgoing-webhook.pb.js`, then customize the reply text after verification.

## Verification

- Missing/invalid `Authorization` returns `401`.
- Valid Teams message returns JSON such as `{ "type": "message", "text": "..." }`.
- Route responds within the Teams timeout. Do not call slow external APIs, LLMs, or workflows before returning.
