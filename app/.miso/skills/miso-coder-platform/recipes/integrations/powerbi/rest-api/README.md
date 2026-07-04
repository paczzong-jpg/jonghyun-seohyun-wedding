# Power BI REST API Recipe

## When To Use

Use this when a generated MISO website app needs to list Power BI workspaces or reports through Microsoft Entra service principal authentication.

This recipe is for backend-to-Power BI REST API access. It is not a user delegated login flow and not a full embedded report token recipe.

## Official Docs To Check

- Power BI service principal embedding/authentication: https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-service-principal
- Power BI get workspaces: https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-groups
- Power BI get reports in group: https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-reports-in-group
- Microsoft identity platform client credentials: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow

## Env Request

```ts
{
  title: "Connect Power BI",
  description: "Enter the Power BI service principal values.",
  variables: [
    { key: "POWERBI_TENANT_ID", target: "backend", secret: false, required: true },
    { key: "POWERBI_CLIENT_ID", target: "backend", secret: false, required: true },
    { key: "POWERBI_CLIENT_SECRET", target: "backend", secret: true, required: true },
    { key: "POWERBI_WORKSPACE_ID", target: "backend", secret: false, required: false }
  ]
}
```

Power BI tenant settings must allow service principals, and the service principal must be added to the target workspace.

## Files

1. Copy `powerbi-rest.pb.js` to `api/powerbi-rest.pb.js`.
2. Frontend calls `POST /api/powerbi/reports`; omit `workspaceId` to list workspaces.

## Route Contract

`POST /api/powerbi/reports`

```json
{
  "workspaceId": "optional-workspace-guid"
}
```

If `workspaceId` is absent and `POWERBI_WORKSPACE_ID` is not set, the route lists workspaces. If a workspace ID is present, it lists reports in that workspace.

## Frontend Rule

Browser code calls the local route only:

```ts
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

const response = await fetch(`${getRuntimeBase()}/api/powerbi/reports`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ workspaceId }),
});

const result = await response.json();
```

Do not expose `POWERBI_CLIENT_SECRET` through `VITE_*`. Do not call Entra token endpoints or Power BI REST APIs directly from React.

## Power BI Checklist

- Entra app registration exists and has a client secret.
- Power BI tenant settings allow service principals to use Power BI APIs.
- Service principal is added to the workspace with the least role required.
- API permissions/admin consent match the REST endpoints used by the app.
- Use a backend env value for a fixed workspace when the UI should not enumerate all workspaces.

## Verification

- `api/powerbi-rest.pb.js` passes `node --check`.
- Browser code contains no client secret.
- Route uses `runtimeProxy.proxyFetch`.
- Workspace list or report list returns `ok: true`.

## Common Failures

- `invalid_client`: client ID/secret or tenant ID is wrong.
- `unauthorized_client`: tenant does not allow service principal API usage.
- `403`: service principal is not in the workspace or lacks API permission/admin consent.
- Empty `value`: service principal authenticated but has no visible workspaces/reports.
