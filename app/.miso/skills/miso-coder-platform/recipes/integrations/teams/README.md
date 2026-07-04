# Microsoft Teams Integration Recipe

Use this when a generated MISO website app must post to Microsoft Teams, receive Teams outgoing webhooks, or send Teams messages through Microsoft Graph.

Teams integration is not MISO auth. Keep it under `recipes/integrations/teams/*`.

MISO personal connector OAuth is currently unavailable in the API rollout. For user-delegated Microsoft 365 account access from a website app (Outlook, Calendar, OneDrive, SharePoint, Teams messages, meetings, OneNote), do not use `recipes/miso/connectors/README.md`, `miso-connectors.ts`, `/__api/auth/connectors/*`, or `connectorAuth`. This Teams recipe remains for Teams-specific webhooks, app-only notifications, and explicitly requested standalone Graph implementations.

## Official Docs To Check

- Teams webhooks and connectors: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/what-are-webhooks-and-connectors
- Create Teams incoming webhook with Workflows: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Create Teams outgoing webhook: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-outgoing-webhook
- Microsoft Graph send chatMessage: https://learn.microsoft.com/en-us/graph/api/chatmessage-post
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference

## Feature Choices

| User request | Recipe | Credential |
| --- | --- | --- |
| Post a simple alert/message to Teams | `workflows-webhook/README.md` | `TEAMS_WORKFLOW_WEBHOOK_URL`, backend secret |
| Let Teams users `@mention` a webhook and receive a synchronous reply | `outgoing-webhook/README.md` | `TEAMS_OUTGOING_WEBHOOK_HMAC_KEY_RAW`, backend-readable verifier |
| Send Teams messages through MISO Microsoft connector | Do not implement yet | MISO connector OAuth unavailable |
| Send Teams messages through standalone Microsoft Graph | `graph-message/README.md` | Entra OAuth/client credentials or delegated token, advanced |

## Current Best Practice

Do not make legacy Office 365 Connector Incoming Webhook the default path. Microsoft is retiring Microsoft 365/Office 365 connectors and recommends Teams Workflows, Teams apps/bots, or Microsoft Graph depending on the feature. For new generated apps, prefer:

1. `workflows-webhook` for simple MISO-to-Teams notifications.
2. `outgoing-webhook` for Teams-to-MISO command-like callbacks.
3. `graph-message` only when the user explicitly needs Graph capabilities and can configure Entra permissions.

## MISO Runtime Rules

- Outbound calls to Teams/Power Automate/Graph must use PocketBase `runtimeProxy.proxyFetch`.
- Browser code must not store Teams webhook URLs, Graph tokens, client secrets, or HMAC keys.
- Teams outgoing webhook verification runs inside PocketBase and needs the actual HMAC key locally. Do not mark that verifier as `secret: true`; MISO `secret: true` values are managed placeholders inside PocketBase.
- Teams outgoing webhooks must respond quickly with a message/card. Do not run slow LLM/workflow work before the response.

## Published URL For Teams To MISO

Register Teams outgoing webhook callbacks with:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/teams/outgoing-webhook
```

The website app must be published and external/public unless Teams can send MISO login cookies, which normal Teams webhooks cannot. If MISO IP restriction is enabled, allow Microsoft/Teams source IPs or Teams receives `403` before PocketBase logs.
