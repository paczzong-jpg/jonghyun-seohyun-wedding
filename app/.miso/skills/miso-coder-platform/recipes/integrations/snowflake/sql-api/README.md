# Snowflake SQL API Recipe

## When To Use

Use this when a generated MISO website app needs read-only query results from Snowflake through the Snowflake SQL API.

This recipe is for app UI queries and small dashboard-style result sets. It is not a bulk export path, not a native Snowflake driver recipe, and not a key-pair JWT generator.

## Official Docs To Check

- Snowflake SQL API overview: https://docs.snowflake.com/en/developer-guide/sql-api/index
- SQL API reference: https://docs.snowflake.com/en/developer-guide/sql-api/reference
- Submit SQL requests: https://docs.snowflake.com/en/developer-guide/sql-api/submitting-requests
- SQL API authentication: https://docs.snowflake.com/en/developer-guide/sql-api/authenticating
- Programmatic access tokens: https://docs.snowflake.com/en/user-guide/programmatic-access-tokens

## Supported MISO Path

Use a backend PocketBase route with `runtimeProxy.proxyFetch`. Do not install Snowflake drivers in the sandbox.

Request env values:

```ts
{
  title: "Connect Snowflake",
  description: "Enter the Snowflake SQL API settings.",
  variables: [
    { key: "SNOWFLAKE_ACCOUNT_URL", target: "backend", secret: false, required: true },
    { key: "SNOWFLAKE_PAT", target: "backend", secret: true, required: true },
    { key: "SNOWFLAKE_TOKEN_TYPE", target: "backend", secret: false, required: false },
    { key: "SNOWFLAKE_WAREHOUSE", target: "backend", secret: false, required: false },
    { key: "SNOWFLAKE_DATABASE", target: "backend", secret: false, required: false },
    { key: "SNOWFLAKE_SCHEMA", target: "backend", secret: false, required: false },
    { key: "SNOWFLAKE_ROLE", target: "backend", secret: false, required: false }
  ]
}
```

`SNOWFLAKE_PAT` can also be an OAuth access token. If it is OAuth, set `SNOWFLAKE_TOKEN_TYPE=OAUTH`; otherwise the route defaults to `PROGRAMMATIC_ACCESS_TOKEN`.

## Files

1. Copy `snowflake-sql.pb.js` to `api/snowflake-sql.pb.js`.
2. Frontend calls `POST /api/snowflake/sql/query` with `{ statement }`.

## Route Contract

`POST /api/snowflake/sql/query`

```json
{
  "statement": "select current_version()",
  "timeoutSeconds": 30
}
```

The route returns the Snowflake SQL API response as `{ ok: true, data }`. Keep UI queries narrow and add explicit `limit` clauses for tables.

## Frontend Rule

Browser code calls the local route only:

```ts
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

const response = await fetch(`${getRuntimeBase()}/api/snowflake/sql/query`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ statement: "select * from analytics.orders limit 50" }),
});

const result = await response.json();
```

Do not put Snowflake tokens in `VITE_*` env values. Do not call `https://*.snowflakecomputing.com` from React.

## Snowflake Checklist

- Account URL is the SQL API account base URL, for example `https://<account_identifier>.snowflakecomputing.com`.
- PAT/OAuth token belongs to a user or integration with only the required role.
- Warehouse, database, schema, and role are set when the token default context is not enough.
- If the enterprise requires key-pair JWT auth, use a token broker or future platform signer; do not generate JWTs in PocketBase Goja.

## Guardrails

- Default route accepts only `select`, `with`, `show`, `describe`, `desc`, and `explain`.
- Use a role restricted to the minimum warehouse/database/schema needed.
- Keep row limits small and page/aggregate large datasets intentionally.
- Do not generate Snowflake key-pair JWTs in PocketBase Goja. If the enterprise requires key-pair auth, use a token broker or platform signer.

## Verification

- `api/snowflake-sql.pb.js` passes `node --check`.
- Browser code contains no Snowflake token or account secret.
- Route uses `runtimeProxy.proxyFetch`.
- `select current_version()` returns `ok: true`.

## Common Failures

- `401` or `390144`: token is invalid, expired, or the token type header is wrong.
- `403` or role errors: token user lacks role/warehouse/database permissions.
- `404`: account URL is wrong or includes an extra path.
- Timeout: query is too large for an interactive app route; narrow the query or add a deliberate async/polling recipe.
