# Dooray Project Posts Recipe

Use this for website app features that create Dooray tasks, list Dooray projects or tasks, and add task comments.

## Files

1. Copy `dooray-project-posts.pb.js` to `api/dooray-project-posts.pb.js`.
2. Copy `DoorayTaskCreator.tsx` into an app-owned component path if the app needs a ready task form.
3. Request Dooray env values with `miso_env_vars_request` from `../README.md`.

## Route Contract

`GET /api/dooray/project/projects`

Query parameters:

| Name | Required | Description |
| --- | --- | --- |
| `page` | No | Dooray page number. Defaults to `0`. |
| `size` | No | Page size. Defaults to `50`, max `100`. |
| `type` | No | `public` or `private` when the tenant uses both. |

`GET /api/dooray/project/members?projectId=<projectId>`

Use this before rendering assignee pickers. Dooray task creation needs member IDs, not display names.

`GET /api/dooray/project/posts?projectId=<projectId>`

Optional filters: `page`, `size`, `subjects`, `postNumber`, `order`.

`POST /api/dooray/project/posts`

```json
{
  "projectId": "1234567890123456789",
  "subject": "Customer follow-up",
  "content": "Markdown task body",
  "to": ["organizationMemberId"],
  "cc": [],
  "priority": "normal",
  "dueDate": "2026-07-01",
  "parentPostId": "optional-parent-post-id",
  "tagIds": ["optional-tag-id"]
}
```

`to` and `cc` accept:

- a string `organizationMemberId`
- `{ "organizationMemberId": "..." }`
- `{ "emailAddress": "external@example.com", "name": "External user" }`
- `{ "projectMemberGroupId": "..." }`

`POST /api/dooray/project/comments`

```json
{
  "projectId": "1234567890123456789",
  "postId": "1234567890123456789",
  "content": "Markdown comment body"
}
```

## Dooray CLI Mapping

The route mirrors these `dooray-cli` client calls:

| MISO route | Dooray REST path |
| --- | --- |
| Project list | `GET project/v1/projects?member=me` |
| Member list | `GET project/v1/projects/{projectId}/members?member=me` |
| Post list | `GET project/v1/projects/{projectId}/posts` |
| Post create | `POST project/v1/projects/{projectId}/posts` |
| Comment create | `POST project/v1/projects/{projectId}/posts/{postId}/logs` |

## Frontend Rule

React code calls the local MISO runtime route only. It never imports a Dooray SDK, never shells out to `dooray`, and never sees `DOORAY_API_TOKEN`.

## Verification

- Missing `DOORAY_API_TOKEN` returns a backend `500` before any upstream call.
- Missing `projectId` returns `400`.
- A read-only project list succeeds before task creation is wired.
- A created task response should include a Dooray `result.id`.
- If member display names fail, list members first and submit `organizationMemberId`.
