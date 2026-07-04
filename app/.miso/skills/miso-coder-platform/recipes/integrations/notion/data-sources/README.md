# Notion Data Sources Recipe

## When To Use

Use this when the app needs to list, filter, or sort entries in an existing Notion data source. In recent Notion API versions, databases are containers and data sources are the table-like API surface.

## Files

1. Copy `notion-data-sources.pb.js` to `api/notion-data-sources.pb.js`.
2. Copy `NotionDataSourceTable.tsx` into an app-owned component path if a basic table is needed.
3. Request `NOTION_API_KEY`, `NOTION_VERSION`, and `NOTION_DATA_SOURCE_ID`.

## Route Contract

`POST /api/notion/data-sources/query`

```json
{
  "dataSourceId": "optional-data-source-id",
  "filter": {},
  "sorts": [],
  "pageSize": 20,
  "startCursor": null
}
```

The route forwards Notion's response shape so the app can handle pagination using `next_cursor` and `has_more`.

## Verification

- A simple query with no filter returns `results`.
- `404` means the integration cannot access the database/data source.
- `400` means filter or sort shape does not match the Notion schema.
- `429` means rate limit; stop retry loops.
