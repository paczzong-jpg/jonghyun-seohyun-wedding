# Warehouse Or BI Integration Fails

## Symptoms

- Snowflake, Databricks, BigQuery, Tableau, or Power BI route returns 401, 403, API disabled, malformed query, missing scope, workspace not found, or gateway errors.
- Browser code works until the local `/api/*` route calls the provider.
- The agent wants to install database drivers, use `curl`, or place service credentials in browser env.

## First Checks

1. Confirm the feature uses a provider recipe under `recipes/integrations/*`, not a generic browser fetch.
2. Confirm missing credentials were requested with `miso_env_vars_request`.
3. Confirm browser files contain no warehouse tokens, client secrets, PATs, or Tableau PAT secrets.
4. Confirm provider calls happen in a PocketBase route through `runtimeProxy.proxyFetch`.
5. Confirm the route follows the provider's supported auth model:
   - Snowflake: PAT/OAuth Bearer token for SQL API.
   - Databricks: workspace URL plus PAT or service-principal token.
   - BigQuery: Google user OAuth token with BigQuery API enabled.
   - Tableau: REST sign-in with PAT, then `X-Tableau-Auth`.
   - Power BI: Entra service principal token, then Power BI REST API.

## Common Wrong Paths

- Installing native database drivers in the sandbox.
- Calling warehouse APIs directly from the browser.
- Using `$http.send` instead of `runtimeProxy.proxyFetch`.
- Logging SQL text that may contain sensitive filters or customer identifiers.
- Making mutation queries the default. Generated app routes should default to read-only SQL.

## Fix Path

- Re-read the provider README and copy the included `*.pb.js` route.
- Re-request missing env values through `miso_env_vars_request`.
- Keep user-entered SQL read-only unless the user explicitly asks for mutations and the app has separate approval UI.
- If the provider needs a gateway or admin setting, document that as setup, not as an app code workaround.

## Verification

- Route syntax passes `node --check`.
- Browser calls only local `/api/*` routes.
- Route uses `runtimeProxy.proxyFetch`.
- Secrets are backend-only and not printed.
- Provider setup checklist in the selected recipe is satisfied.
