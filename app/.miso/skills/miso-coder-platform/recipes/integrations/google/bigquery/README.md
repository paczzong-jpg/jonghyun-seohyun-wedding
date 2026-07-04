# Google BigQuery Query Recipe

## When To Use

Use this when a generated MISO website app needs user-delegated BigQuery query results from the signed-in Google user's accessible projects.

This recipe uses Google Identity Services in the browser to get a short-lived user access token, then sends that token to the local PocketBase route. It is not a service-account JSON recipe and not a background scheduled sync recipe.

BigQuery is a standalone Google API recipe unless a non-OAuth MISO app/tool/workflow is explicitly available in `.miso/specs/api-integration/`. MISO personal connector OAuth is currently unavailable in the API rollout, so do not use `recipes/miso/connectors/README.md`, `miso-connectors.ts`, `/__api/auth/connectors/*`, or `connectorAuth` for BigQuery.

## Official Docs To Check

- Google Identity Services token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- BigQuery `jobs.query`: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
- BigQuery `jobs.getQueryResults`: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/getQueryResults
- Google OAuth scopes: https://developers.google.com/identity/protocols/oauth2/scopes

## Scope

Use `https://www.googleapis.com/auth/bigquery` for query execution. `bigquery.readonly` can work for some read-only query scenarios when IAM allows `bigquery.jobs.create`, but if Google returns a missing scope error, request `bigquery`.

## Files

1. Copy `../googleAccessToken.ts` to `src/lib/googleAccessToken.ts`.
2. Copy `bigquery.pb.js` to `api/google-bigquery.pb.js`.
3. Request `VITE_GOOGLE_CLIENT_ID` with `miso_env_vars_request` if missing.

## Flow

1. Browser calls `getGoogleAccessToken(GOOGLE_BIGQUERY_SCOPE)` from a user click.
2. Browser POSTs `{ accessToken, projectId, query }` to `/api/google/bigquery/query`.
3. PocketBase route calls `jobs.query` through `proxyFetch`.

Default route is read-only and uses GoogleSQL (`useLegacySql: false`).

## Route Contract

`POST /api/google/bigquery/query`

```json
{
  "accessToken": "short-lived-google-access-token",
  "projectId": "analytics-project",
  "query": "select 1 as ok",
  "location": "US",
  "maxResults": 100
}
```

The route returns normalized `rows`, `schema`, `jobReference`, and the raw BigQuery response. If `jobComplete` is false, add a deliberate polling route for `jobs.getQueryResults` before building a long-running query UI.

## Frontend Rule

Call Google consent from a user action, then call the local route:

```ts
import { getGoogleAccessToken, GOOGLE_BIGQUERY_SCOPE } from "@/lib/googleAccessToken";
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

async function runQuery(projectId: string, query: string) {
  const accessToken = await getGoogleAccessToken(GOOGLE_BIGQUERY_SCOPE);
  const response = await fetch(`${getRuntimeBase()}/api/google/bigquery/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, projectId, query, maxResults: 100 }),
  });
  return response.json();
}
```

Do not store Google access tokens in PocketBase records. Do not call BigQuery REST APIs directly from React.

## Google Cloud Checklist

- OAuth consent screen is configured.
- Authorized JavaScript origins includes the generated site origin.
- BigQuery API is enabled.
- User has IAM permissions for `bigquery.jobs.create` and the queried datasets/tables.
- Scope is `bigquery` unless the enterprise explicitly confirms `bigquery.readonly` is enough for its query pattern.

## Verification

- Browser code contains only `VITE_GOOGLE_CLIENT_ID`.
- Route uses `runtimeProxy.proxyFetch`.
- `select 1 as ok` returns one normalized row.

## Common Failures

- `origin_mismatch`: fix Authorized JavaScript origins in Google Cloud.
- `accessNotConfigured`: enable BigQuery API.
- `insufficientPermissions`: token scope or IAM permissions are insufficient.
- `notFound`: project ID, dataset/table name, or location is wrong.
