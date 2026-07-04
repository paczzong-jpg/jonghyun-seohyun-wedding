# Tableau REST API Recipe

## When To Use

Use this when a generated MISO website app needs to list Tableau workbooks or views from Tableau Cloud/Server.

This recipe uses Tableau REST API personal access token sign-in from a PocketBase route. It is not Tableau embedded analytics, not connected app JWT embedding, and not a browser-side Tableau PAT recipe.

## Official Docs To Check

- Tableau REST API overview: https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api.htm
- REST authentication concepts: https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_auth.htm
- Authentication methods reference: https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_authentication.htm
- Personal access tokens: https://help.tableau.com/current/server/en-us/security_personal_access_tokens.htm

## Env Request

```ts
{
  title: "Connect Tableau",
  description: "Enter Tableau REST API values.",
  variables: [
    { key: "TABLEAU_SERVER_URL", target: "backend", secret: false, required: true },
    { key: "TABLEAU_API_VERSION", target: "backend", secret: false, required: false },
    { key: "TABLEAU_SITE_CONTENT_URL", target: "backend", secret: false, required: true },
    { key: "TABLEAU_PAT_NAME", target: "backend", secret: false, required: true },
    { key: "TABLEAU_PAT_SECRET", target: "backend", secret: true, required: true }
  ]
}
```

## Files

1. Copy `tableau-rest.pb.js` to `api/tableau-rest.pb.js`.
2. Frontend calls `POST /api/tableau/workbooks`.

The route signs in with PAT for each request and then lists workbooks. For heavier apps, cache short-lived Tableau credentials carefully server-side only.

## Route Contract

`POST /api/tableau/workbooks`

```json
{}
```

The sample route signs in with PAT, extracts `credentials.token` and `credentials.site.id`, then calls the workbooks endpoint for that site. Extend the same pattern for views only after the workbook list path is verified.

## Frontend Rule

Browser code calls the local route only:

```ts
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

const response = await fetch(`${getRuntimeBase()}/api/tableau/workbooks`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

const result = await response.json();
```

Do not expose `TABLEAU_PAT_SECRET` through `VITE_*`. Do not call Tableau REST APIs directly from React.

## Tableau Checklist

- Server URL is the Tableau Cloud or Server base URL, without trailing slash.
- REST API version matches the Tableau deployment.
- Site content URL matches the Tableau site URL segment; use an empty string only for the default site when Tableau expects it.
- PAT name and secret are active and belong to a user with access to the target site/workbooks.

## Verification

- `api/tableau-rest.pb.js` passes `node --check`.
- Browser code contains no Tableau PAT secret.
- Route uses `runtimeProxy.proxyFetch`.
- Route returns a `workbooks` payload from Tableau.

## Common Failures

- `401` on sign-in: PAT name/secret expired or wrong site content URL.
- `404`: server URL or API version is wrong.
- Empty list: PAT user can sign in but lacks workbook permissions.
- XML response instead of JSON: missing `Accept: application/json` or wrong endpoint.
