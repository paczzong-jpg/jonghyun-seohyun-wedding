# Teams Workflows Webhook

Use this recipe for MISO-to-Teams notifications. This is the preferred simple notification path for new work because Microsoft is retiring Microsoft 365/Office 365 connectors and recommends Teams Workflows for webhook-style posting.

## Official Docs To Check

- Teams webhooks and connectors: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/what-are-webhooks-and-connectors
- Create Teams incoming webhook with Workflows: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Create and send actionable messages: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using

## Env Request

```ts
{
  title: "Connect Teams workflow webhook",
  description: "Enter the Teams Workflows webhook URL for posting messages from this app.",
  variables: [
    { key: "TEAMS_WORKFLOW_WEBHOOK_URL", label: "Teams Workflows webhook URL", target: "backend", secret: true, required: true }
  ]
}
```

The webhook URL is a private outbound credential. Keep it backend-only and pass it only through `runtimeProxy.proxyFetch`.

## Implementation

Copy `teams-workflows-webhook.pb.js` to `api/teams-workflows-webhook.pb.js`. Frontend code calls `/api/teams/workflows/send`; the PocketBase route calls the Teams Workflow webhook URL through the MISO runtime proxy.

The default payload is:

```json
{ "text": "Hello from MISO" }
```

If the user's workflow expects a different schema, update the workflow and route together. Do not send legacy MessageCard payloads unless the selected workflow is explicitly built to transform or accept them.

## Verification

- Route returns `400` if `text` is empty.
- Route returns `500` if `TEAMS_WORKFLOW_WEBHOOK_URL` is missing.
- Route uses `proxyFetch`; no browser direct call to the webhook URL.
- Teams receives the message in the configured chat/channel.
