# Notion Integration Recipe

## When To Use

Use this when a generated MISO website app needs to create Notion pages, append simple content, or query a Notion data source with an internal Notion connection.

Do not put Notion under `recipes/auth`. Notion internal connections are provider API integrations. They do not log the user into the MISO app.

## Official Docs To Check

- Notion API introduction: https://developers.notion.com/reference/intro
- Internal connections: https://developers.notion.com/guides/get-started/internal-connections
- Authentication: https://developers.notion.com/reference/authentication
- Versioning: https://developers.notion.com/reference/versioning
- Create a page: https://developers.notion.com/reference/post-page
- Query a data source: https://developers.notion.com/reference/query-a-data-source
- Request limits: https://developers.notion.com/reference/request-limits
- Status codes: https://developers.notion.com/reference/status-codes

Use the official docs for Notion object shapes. This recipe only fixes the MISO runtime boundary.

## Default Architecture

1. User creates a Notion internal connection.
2. User shares the target Notion page/database with that connection.
3. Agent requests `NOTION_API_KEY` as a backend secret.
4. Agent requests IDs such as `NOTION_PARENT_PAGE_ID` or `NOTION_DATA_SOURCE_ID` as backend non-secret configuration.
5. Browser calls a local PocketBase route.
6. PocketBase route calls `https://api.notion.com/v1/...` through `runtimeProxy.proxyFetch`.

Do not call Notion directly from the browser. The Notion token is private and belongs in a PocketBase hook route.

## Env Request

```ts
{
  title: "Connect Notion",
  description: "Enter the Notion internal connection token and the target page or data source ID.",
  variables: [
    { key: "NOTION_API_KEY", label: "Notion internal connection token", target: "backend", secret: true, required: true },
    { key: "NOTION_VERSION", label: "Notion API version", target: "backend", secret: false, required: false, defaultValue: "2026-03-11" },
    { key: "NOTION_PARENT_PAGE_ID", label: "Default parent page ID", target: "backend", secret: false, required: false },
    { key: "NOTION_DATA_SOURCE_ID", label: "Default data source ID", target: "backend", secret: false, required: false }
  ]
}
```

Use `miso_env_vars_request`; do not ask the user to paste the token into chat.

## Feature Choices

| User request | Recipe |
| --- | --- |
| Create a Notion note/page from form input | `pages/README.md` |
| Save rows to an existing Notion table-like object | `pages/README.md` with `data_source_id` parent and schema-matching properties |
| List/filter items in a Notion table-like object | `data-sources/README.md` |

## Notion Setup Checklist

1. Create an internal connection in Notion.
2. Copy the internal connection token.
3. Share the target page or database with the connection in Notion UI.
4. If using a database, retrieve or copy the child data source ID. New Notion API versions distinguish databases from data sources.
5. Use the narrowest capability set needed by the feature.
6. Respect Notion rate limits. The public API enforces per-connection and workspace limits; do not loop unbounded writes from the browser.

## Verification

- Browser files do not contain `NOTION_API_KEY`.
- Route uses `runtimeProxy.proxyFetch`.
- Route sends `Authorization: Bearer <runtimeEnv.NOTION_API_KEY>` and `Notion-Version`.
- `404` from Notion usually means the page/data source was not shared with the integration.
- `429` means rate limit; add user-visible backoff instead of retry loops.
- Page/data source property names match the Notion schema.
