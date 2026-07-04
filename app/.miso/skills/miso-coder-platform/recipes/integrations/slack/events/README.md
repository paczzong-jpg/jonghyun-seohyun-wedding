# Slack Events API Recipe

## When To Use

Use this when Slack should notify the generated app about app mentions, messages, reactions, or other Events API events.

## Files

1. Copy `slack-events.pb.js` to `api/slack-events.pb.js`.
2. Request `SLACK_SIGNING_SECRET_RAW` as a backend-readable verifier.
3. Register the published request URL in Slack:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/slack/events
```

## Route Behavior

- For Slack URL verification, return the `challenge`.
- For event callbacks, acknowledge immediately.
- Do slow business logic after acknowledgment only if the implementation has a safe queue/background path. Do not block Slack delivery.

## Verification

- Slack dashboard URL verification succeeds.
- Route rejects stale timestamps and invalid signatures.
- Event callback returns `200` quickly.
