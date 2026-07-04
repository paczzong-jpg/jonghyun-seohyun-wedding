# Notion Pages Recipe

## When To Use

Use this for "save this form/report/summary to Notion" features. The route can create a page under a parent page or create a row-like page under a Notion data source.

## Files

1. Copy `notion-pages.pb.js` to `api/notion-pages.pb.js`.
2. Copy `NotionPageCreator.tsx` into an app-owned component path if the app needs a ready UI.
3. Request Notion env values with `miso_env_vars_request`.

## Route Contract

`POST /api/notion/pages`

```json
{
  "title": "Customer note",
  "content": "Body text",
  "parentPageId": "optional-page-id",
  "dataSourceId": "optional-data-source-id",
  "properties": {
    "Name": { "title": [{ "text": { "content": "Customer note" } }] }
  }
}
```

If `dataSourceId` is provided, `properties` must match that data source schema. If only `parentPageId` is provided, the route creates a normal child page with a title and optional paragraph content.

## Frontend Rule

The component calls `/api/notion/pages`. Do not import a Notion SDK, do not call `https://api.notion.com` from React, and do not expose `NOTION_API_KEY` through `VITE_*`.

## Verification

- Creating a simple child page returns `ok: true` and a Notion `id`.
- A `404` from Notion means the integration probably cannot access the parent.
- A `400` with property errors means the data source property names or types do not match the schema.
