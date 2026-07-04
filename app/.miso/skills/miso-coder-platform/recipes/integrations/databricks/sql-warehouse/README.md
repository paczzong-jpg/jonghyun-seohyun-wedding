# Databricks SQL Warehouse Recipe

## When To Use

Use this when a generated MISO website app needs read-only query results from a Databricks SQL warehouse.

This recipe is for small app UI result sets through the Databricks Statement Execution API. It is not a Spark job runner and not a native Databricks SQL connector recipe.

## Official Docs To Check

- Statement Execution API tutorial: https://docs.databricks.com/aws/en/dev-tools/sql-execution-tutorial
- Statement Execution API reference: https://docs.databricks.com/api/workspace/statementexecution
- Databricks authentication overview: https://docs.databricks.com/aws/en/dev-tools/auth/
- Personal access token auth: https://docs.databricks.com/aws/en/dev-tools/auth/pat

## Env Request

```ts
{
  title: "Connect Databricks SQL",
  description: "Enter the Databricks SQL warehouse connection values.",
  variables: [
    { key: "DATABRICKS_WORKSPACE_URL", target: "backend", secret: false, required: true },
    { key: "DATABRICKS_TOKEN", target: "backend", secret: true, required: true },
    { key: "DATABRICKS_WAREHOUSE_ID", target: "backend", secret: false, required: true }
  ]
}
```

Use a service principal or PAT with only the required warehouse and catalog permissions.

## Files

1. Copy `databricks-sql.pb.js` to `api/databricks-sql.pb.js`.
2. Frontend calls `POST /api/databricks/sql/query` with `{ statement }`.

## Route Contract

`POST /api/databricks/sql/query`

```json
{
  "statement": "select current_catalog()",
  "rowLimit": 100
}
```

`warehouseId` can be passed in the body for advanced multi-warehouse apps, but prefer the backend `DATABRICKS_WAREHOUSE_ID` env value so normal UI code cannot choose arbitrary compute.

## Frontend Rule

Browser code calls the local route only:

```ts
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

const response = await fetch(`${getRuntimeBase()}/api/databricks/sql/query`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    statement: "select * from samples.nyctaxi.trips limit 50",
    rowLimit: 50,
  }),
});

const result = await response.json();
```

Do not put Databricks PATs in `VITE_*` env values. Do not call the workspace API directly from React.

## Databricks Checklist

- Workspace URL is the browser workspace base URL, without trailing slash.
- Token maps to a user or service principal with CAN USE permission on the SQL warehouse.
- Token principal has catalog/schema/table permissions for every queried object.
- SQL warehouse ID is copied from Databricks SQL Warehouses, not a cluster ID.

## Guardrails

- Default route accepts only `select`, `with`, `show`, `describe`, `desc`, and `explain`.
- Use `disposition: INLINE` and a small row limit for app UI queries.
- For large results, create a separate recipe that fetches statement chunks deliberately.

## Verification

- `api/databricks-sql.pb.js` passes `node --check`.
- Browser code contains no Databricks token.
- Route uses `runtimeProxy.proxyFetch`.
- `select current_catalog()` returns `ok: true`.

## Common Failures

- `401`: token is missing, expired, or for the wrong workspace.
- `403`: token principal lacks SQL warehouse or Unity Catalog permissions.
- `404`: workspace URL or warehouse ID is wrong.
- Response has a statement ID but no rows: query did not finish inside the inline wait timeout; use a smaller query or add an explicit polling route.
