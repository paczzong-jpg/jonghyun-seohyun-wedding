# GitHub Webhook Verification

Use this recipe when GitHub webhooks call a generated MISO website app.

## Official Docs To Check

- Validating webhook deliveries: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- Webhook events and payloads: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- Troubleshooting webhooks: https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/troubleshooting-webhooks

## MISO Route

Register GitHub with:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/github/webhook
```

The app must be external/public if GitHub calls without MISO cookies. If MISO IP restriction is enabled, allow GitHub webhook delivery IPs or GitHub receives `403` before PocketBase route logs.

## Env Request

GitHub signs the exact raw request body with the webhook secret and sends the HMAC-SHA256 digest in `X-Hub-Signature-256`.

```ts
{
  title: "Connect GitHub webhook verification",
  description: "Enter the GitHub webhook secret used to verify deliveries inside PocketBase.",
  variables: [
    { key: "GITHUB_WEBHOOK_SECRET_RAW", label: "GitHub webhook secret for local HMAC verification", target: "backend", secret: false, required: true }
  ]
}
```

Do not mark this value `secret: true` while verification runs inside PocketBase; MISO exposes `secret: true` backend values as managed placeholders there.

## Implementation

Copy `github-webhook.pb.js` to `api/github-webhook.pb.js`, then handle event-specific behavior after the signature check.

The route uses:

- `readerToString(e.request.body)` for the raw body.
- `sha256=` + `$security.hs256(rawBody, GITHUB_WEBHOOK_SECRET_RAW)`.
- `X-GitHub-Event` and `X-GitHub-Delivery` only after the signature passes.

## Verification

- Missing or invalid `X-Hub-Signature-256` returns `401`.
- Valid ping event returns `200`.
- Route responds quickly; enqueue slow work through a platform async bridge.
