# Slack Slash Command Recipe

## When To Use

Use this when a Slack slash command should call the generated MISO website app.

## Files

1. Copy `slack-slash-command.pb.js` to `api/slack-slash-command.pb.js`.
2. Request `SLACK_SIGNING_SECRET_RAW` as a backend-readable verifier.
3. Register the published request URL in Slack:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/slack/slash-command
```

## Why `SLACK_SIGNING_SECRET_RAW`

Slack requires HMAC over the exact raw request body. MISO `secret: true` values are managed placeholders inside PocketBase. They cannot be used for local HMAC. Use a backend value that is intentionally available to PocketBase, keep it out of browser code, and prefer a platform inbound-secret verifier if one becomes available.

## Verification

- Slack request URL receives `200`.
- Route rejects missing or stale `X-Slack-Request-Timestamp`.
- Route rejects invalid `X-Slack-Signature`.
- Route responds fast and does not call slow external systems before the immediate Slack response.
