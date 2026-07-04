# Dooray Wiki Pages Recipe

Use this for website app features that create Dooray Wiki pages, list Wiki pages, or add comments to Wiki pages.

## Files

1. Copy `dooray-wiki-pages.pb.js` to `api/dooray-wiki-pages.pb.js`.
2. Copy `DoorayWikiPageCreator.tsx` into an app-owned component path if the app needs a ready page form.
3. Request Dooray env values with `miso_env_vars_request` from `../README.md`.

## Route Contract

`GET /api/dooray/wiki/wikis`

Lists accessible Dooray wikis. Use each wiki's `home.pageId` as the default `parentPageId` when creating a top-level child page.

`GET /api/dooray/wiki/pages?wikiId=<wikiId>`

Optional query values:

| Name | Required | Description |
| --- | --- | --- |
| `parentPageId` | No | List children under this page. |
| `pageId` | No | If present, returns a single page detail instead of page list. |

`POST /api/dooray/wiki/pages`

```json
{
  "wikiId": "1234567890123456789",
  "parentPageId": "1234567890123456789",
  "subject": "Release note",
  "content": "Markdown wiki body"
}
```

`POST /api/dooray/wiki/comments`

```json
{
  "wikiId": "1234567890123456789",
  "pageId": "1234567890123456789",
  "content": "Markdown comment body"
}
```

## Dooray CLI Mapping

The route mirrors these `dooray-cli` client calls:

| MISO route | Dooray REST path |
| --- | --- |
| Wiki list | `GET wiki/v1/wikis` |
| Page list | `GET wiki/v1/wikis/{wikiId}/pages` |
| Page detail | `GET wiki/v1/wikis/{wikiId}/pages/{pageId}` |
| Page create | `POST wiki/v1/wikis/{wikiId}/pages` |
| Comment create | `POST wiki/v1/wikis/{wikiId}/pages/{pageId}/comments` |

## Frontend Rule

React code calls the local MISO runtime route only. It never imports a Dooray SDK, never shells out to `dooray`, and never sees `DOORAY_API_TOKEN`.

## Verification

- Start by calling wiki list and confirm the selected wiki has a `home.pageId`.
- Missing `wikiId` or `parentPageId` returns `400`.
- A created page response should include a Dooray `result.id`.
- If a top-level page create fails, use the wiki's home page as `parentPageId`.
- Do not implement file upload from this recipe. Dooray Wiki file upload needs multipart and redirect behavior that must be separately verified.
