# Teams Graph Message

Use this recipe only when the user explicitly needs Microsoft Graph Teams messaging, such as posting to a channel/chat with Microsoft Graph rather than using a Teams Workflows webhook.

## Official Docs To Check

- Microsoft Graph send chatMessage: https://learn.microsoft.com/en-us/graph/api/chatmessage-post
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft identity platform OAuth 2.0 client credentials flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow

## Use Workflows First For Simple Alerts

Do not use Microsoft Graph just to post a simple notification if a Teams Workflows webhook meets the requirement. Graph messaging requires Entra app registration, tenant/admin consent, token acquisition, Teams scopes, and Graph endpoint selection.

## Required Decisions Before Coding

- Is the message sent on behalf of a signed-in user or by an app/bot?
- Is the target a channel, chat, or reply thread?
- Has the customer configured the required Entra app registration and consent?
- Which Graph endpoint and permission type does the official docs allow for the chosen target?

## MISO Runtime Rules

- Browser code must not contain Graph client secrets, tenant secrets, or app-only tokens.
- Backend Graph calls must go through PocketBase `runtimeProxy.proxyFetch`.
- Request missing values with `miso_env_vars_request`; do not ask for secrets in chat.

Example env request for a backend token bridge:

```ts
{
  title: "Connect Microsoft Graph for Teams",
  description: "Enter Entra app values for Microsoft Graph token acquisition.",
  variables: [
    { key: "MS_TENANT_ID", label: "Microsoft tenant ID", target: "backend", secret: false, required: true },
    { key: "MS_CLIENT_ID", label: "Microsoft Entra client ID", target: "backend", secret: false, required: true },
    { key: "MS_CLIENT_SECRET", label: "Microsoft Entra client secret", target: "backend", secret: true, required: true }
  ]
}
```

## Implementation Boundary

This recipe intentionally does not provide a one-size-fits-all `pb.js` because the correct Graph endpoint and permission model vary by user request and tenant policy. Read the official Graph docs for the selected endpoint, then implement a small PocketBase route using `proxyFetch`.

If the user only needs alerts, use `workflows-webhook/README.md`.
