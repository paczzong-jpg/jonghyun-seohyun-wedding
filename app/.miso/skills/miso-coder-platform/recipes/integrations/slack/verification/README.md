# Slack Request Verification

Use this recipe whenever Slack calls a generated MISO website app: slash commands, Events API, interactions, shortcuts, or message actions.

## Official Docs To Check

- Slack verifying requests: https://docs.slack.dev/authentication/verifying-requests-from-slack/
- Slack slash commands: https://docs.slack.dev/interactivity/implementing-slash-commands
- Slack Events API: https://docs.slack.dev/apis/events-api/

## MISO Route

Register Slack with the published URL for the selected feature:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/slack/<capability>
```

The app must be external/public unless Slack can provide MISO login cookies, which normal Slack callbacks cannot. If MISO IP restriction is enabled, allow Slack delivery IPs or Slack receives `403` before PocketBase route logs.

## Env Request

PocketBase must compute HMAC locally, so do not request the signing secret as `secret: true`. Current MISO `secret: true` backend env values are managed placeholders inside PocketBase and only become real values during outbound `proxyFetch`.

```ts
{
  title: "Connect Slack inbound verification",
  description: "Enter the Slack signing secret used to verify callbacks inside PocketBase.",
  variables: [
    { key: "SLACK_SIGNING_SECRET_RAW", label: "Slack signing secret for local HMAC verification", target: "backend", secret: false, required: true }
  ]
}
```

## Implementation

Copy `slack-verified-callback.pb.js` to `api/slack-verified-callback.pb.js`, then adapt the success branch for the selected Slack feature.

The important part is invariant:

1. Read `rawBody = readerToString(e.request.body)` before parsing.
2. Read `X-Slack-Request-Timestamp` and reject timestamps older than 5 minutes.
3. Compute `v0:<timestamp>:<rawBody>` with `$security.hs256(...)`.
4. Compare with `X-Slack-Signature` using constant-time string comparison.

Do not use `e.requestInfo().body` before signature verification; parsing changes the signed payload shape.

## Verification

- Invalid or stale timestamp returns `401`.
- Invalid signature returns `401`.
- Slack `url_verification` payload returns the challenge for Events API.
- Route responds quickly; slow LLM/workflow work must happen after acknowledgement through a platform async bridge.
