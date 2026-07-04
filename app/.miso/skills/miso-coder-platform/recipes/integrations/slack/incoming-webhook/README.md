# Slack Incoming Webhook Recipe

## When To Use

Use this for a simple "send message to this Slack channel" feature. Incoming webhooks are tied to a Slack app and a destination conversation.

## Files

1. Copy `slack-incoming-webhook.pb.js` to `api/slack-incoming-webhook.pb.js`.
2. Copy `SlackWebhookSender.tsx` into an app-owned component path if a ready UI is useful.
3. Request `SLACK_WEBHOOK_URL` with `miso_env_vars_request`.

## Route Contract

`POST /api/slack/incoming-webhook/send`

```json
{
  "text": "Deployment finished",
  "blocks": []
}
```

`blocks` is optional and must follow Slack Block Kit format.

## Verification

- `SLACK_WEBHOOK_URL` is backend secret.
- Browser calls only `/api/slack/incoming-webhook/send`.
- Route returns `ok: true` when Slack returns `ok`.
- A `404`/`410` provider response usually means the webhook was revoked or copied incorrectly.
