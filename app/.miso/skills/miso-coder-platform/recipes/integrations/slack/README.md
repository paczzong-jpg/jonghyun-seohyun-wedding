# Slack Integration Recipe

## When To Use

Use this when a generated MISO website app needs to post Slack messages, receive slash commands, or receive Slack Events API callbacks.

Slack app login/OAuth installation is not the same as a MISO app login feature. Keep Slack API features here under `recipes/integrations/slack/*`.

## Official Docs To Check

- Incoming webhooks: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Messaging overview: https://docs.slack.dev/messaging/
- `chat.postMessage`: https://docs.slack.dev/reference/methods/chat.postMessage
- App scopes: https://docs.slack.dev/reference/scopes
- Verifying Slack requests: https://docs.slack.dev/authentication/verifying-requests-from-slack
- Slash commands: https://docs.slack.dev/interactivity/implementing-slash-commands
- Events API: https://docs.slack.dev/apis/events-api/
- HTTP Request URLs: https://docs.slack.dev/apis/events-api/using-http-request-urls

## Feature Choices

| User request | Recipe | Credential |
| --- | --- | --- |
| Post a simple message to a fixed Slack channel | `incoming-webhook/README.md` | `SLACK_WEBHOOK_URL`, backend secret |
| Post a message with a Slack bot token | `bot-message/README.md` | `SLACK_BOT_TOKEN`, backend secret |
| Build `/command` interaction | `slash-command/README.md` | `SLACK_SIGNING_SECRET_RAW`, backend-readable verifier |
| Receive app events | `events/README.md` | `SLACK_SIGNING_SECRET_RAW`, backend-readable verifier |
| Verify any Slack inbound callback before custom handling | `verification/README.md` | `SLACK_SIGNING_SECRET_RAW`, backend-readable verifier |

## Env Request

Outbound secrets:

```ts
{
  title: "Connect Slack outbound messaging",
  description: "Enter Slack credentials for sending messages.",
  variables: [
    { key: "SLACK_WEBHOOK_URL", label: "Incoming webhook URL", target: "backend", secret: true, required: false },
    { key: "SLACK_BOT_TOKEN", label: "Bot token", target: "backend", secret: true, required: false },
    { key: "SLACK_DEFAULT_CHANNEL", label: "Default channel ID", target: "backend", secret: false, required: false }
  ]
}
```

Inbound signing secret:

```ts
{
  title: "Connect Slack inbound requests",
  description: "Enter a Slack signing secret only if this app must verify slash commands or events inside PocketBase.",
  variables: [
    { key: "SLACK_SIGNING_SECRET_RAW", label: "Slack signing secret for local HMAC verification", target: "backend", secret: false, required: true }
  ]
}
```

`SLACK_SIGNING_SECRET_RAW` is intentionally not `secret: true` because PocketBase must compute HMAC locally. Current MISO `secret: true` values are managed placeholders inside PocketBase and only become real values during outbound `proxyFetch`.

## Published URL For Inbound Slack

Register the published URL:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/slack/slash-command
https://<miso-origin>/site/<site_code>/__runtime/api/slack/events
```

The app must be external/public or Slack receives `401/403`. If app IP restrictions are enabled, allow Slack delivery IPs or the platform blocks before the PocketBase route.

## Verification

- Outbound routes use `proxyFetch` and never expose Slack token/webhook URL in browser code.
- Slash/events routes read raw body with `readerToString(e.request.body)` before parsing.
- Slash/events routes compute `v0:<timestamp>:<rawBody>` with `$security.hs256`.
- Slash/events routes reject timestamps older than five minutes.
- Slash/events routes respond quickly; do not run slow LLM/workflow calls before the immediate Slack response.

For custom interactions, shortcuts, or message actions, start from `verification/slack-verified-callback.pb.js` instead of reimplementing Slack HMAC from memory.
