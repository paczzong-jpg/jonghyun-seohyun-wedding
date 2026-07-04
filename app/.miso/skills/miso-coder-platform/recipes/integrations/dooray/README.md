# Dooray Integration Recipes

Dooray is an external provider integration, not MISO auth and not a CLI install recipe. Use this folder when a generated website app must create or read Dooray Project tasks, add comments, or write Dooray Wiki pages through the app backend.

## Read This First

Dooray official API docs are served through the Dooray guide site and can be hard to extract statically. Before implementing a new Dooray capability, check the official guide in the browser first:

- Dooray API guide: https://helpdesk.dooray.com/share/pages/9wWo-xwiR66BO5LGshgVTg/2937064454837487755
- Dooray guide examples may also link related API pages under `https://helpdesk.dooray.com/share/pages/9wWo-xwiR66BO5LGshgVTg/`

For the concrete REST surface used here, `dooray-cli` is the implementation reference: https://github.com/jon890/dooray-cli

Confirmed from `dooray-cli`:

- Default base URL: `https://api.dooray.com`
- API token issue path: `https://{tenant}.dooray.com/setting/api/token`
- Authorization: `dooray-api <token>`
- Project APIs use `project/v1/...`
- Wiki APIs use `wiki/v1/...`
- Markdown bodies use `body: { mimeType: "text/x-markdown", content: "..." }`

## Choose The Recipe

| User request | Use | Notes |
| --- | --- | --- |
| Create Dooray tasks, list tasks, list projects, add task comments | `project-posts/README.md` | Uses Dooray Project REST API through a PocketBase route. |
| Create Dooray Wiki pages, list pages, add Wiki page comments | `wiki-pages/README.md` | Uses Dooray Wiki REST API through a PocketBase route. |
| Send or read Dooray Mail | Do not implement from this recipe | Dooray Mail in `dooray-cli` uses IMAP/SMTP with Node packages. PocketBase JSVM routes cannot open IMAP/SMTP sockets or use npm packages. |
| Upload Dooray files | Do not claim support until verified | `dooray-cli` uses multipart upload plus redirect handling. Only add a MISO recipe after verifying `proxyFetch` multipart and binary behavior end to end. |
| Dooray Messenger hook | Add a separate recipe only after checking official Dooray Messenger docs | Do not infer Messenger payloads from Project/Wiki APIs. |

## Credential Request

Use `miso_env_vars_request` before writing code that depends on missing Dooray values:

```ts
{
  title: "Connect Dooray",
  description: "Enter a Dooray API token for Project and Wiki API calls.",
  variables: [
    {
      key: "DOORAY_API_TOKEN",
      label: "Dooray API token",
      target: "backend",
      secret: true,
      required: true
    },
    {
      key: "DOORAY_BASE_URL",
      label: "Dooray API base URL",
      target: "backend",
      secret: false,
      required: false,
      placeholder: "https://api.dooray.com"
    },
    {
      key: "DOORAY_DEFAULT_PROJECT_ID",
      label: "Default Dooray project ID",
      target: "backend",
      secret: false,
      required: false
    },
    {
      key: "DOORAY_DEFAULT_WIKI_ID",
      label: "Default Dooray wiki ID",
      target: "backend",
      secret: false,
      required: false
    }
  ]
}
```

## MISO Runtime Rules

- Do not install `@bifos/dooray-cli` inside a generated website app. It is a useful reference, not a runtime dependency.
- Do not call `https://api.dooray.com` from React.
- Do not expose `DOORAY_API_TOKEN` as `VITE_...`.
- Do not ask the user to paste the token in chat.
- Backend routes must use `require(__hooks + "/_runtime_env.js")` and `require(__hooks + "/_runtime_proxy.js")`.
- Backend routes must call `runtimeProxy.proxyFetch`; do not use `$http.send`.
- PocketBase hook code is Goja/CommonJS. Do not use npm packages, `import`, `export`, or `async`/`await` in `*.pb.js`.

## Verification

1. Request env values with `miso_env_vars_request`.
2. Copy the selected `*.pb.js` file into the app `api/` folder.
3. Start with a read-only route: project list or wiki list.
4. Confirm a successful response has Dooray's `header.isSuccessful` or a valid `result`.
5. Only then add create/update UI. If Dooray returns `403`, fix Dooray token permissions or project/wiki access, not CORS.
