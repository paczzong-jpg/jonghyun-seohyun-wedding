# Slack Bot Message Recipe

## When To Use

Use this when the app needs to post to dynamic Slack channels, DMs, or threads through Slack Web API. The Slack app needs a bot token with `chat:write` and any additional scopes required by the target conversation.

## Files

1. Copy `slack-bot-message.pb.js` to `api/slack-bot-message.pb.js`.
2. Copy `SlackBotMessageSender.tsx` if a ready UI is needed.
3. Request `SLACK_BOT_TOKEN` and optionally `SLACK_DEFAULT_CHANNEL`.

## Route Contract

`POST /api/slack/bot-message/send`

```json
{
  "channel": "C0123456789",
  "text": "Message",
  "threadTs": "optional-thread-ts"
}
```

## Verification

- Slack app is installed to the workspace.
- Bot token has `chat:write`.
- Bot is allowed in the target channel or the channel is public and scopes allow posting.
- Route forwards Slack's `ok`, `error`, `channel`, and `ts` fields.
