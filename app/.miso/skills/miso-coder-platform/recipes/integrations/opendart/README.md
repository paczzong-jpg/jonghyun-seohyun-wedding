# OpenDART Integration Recipes

OpenDART is an external Korean disclosure integration recipe, not MISO auth, not a PocketBase auth provider, and not a MISO reference surface. Use this folder when a generated website app needs Korean corporate disclosures, company profiles, DART corp codes, or financial statement data from `opendart.fss.or.kr`.

## Read This First

OpenDART official docs are the source of truth for endpoint shape, request limits, and response codes. Check the selected official page before extending this recipe:

- OpenDART home and API key issue entry: https://opendart.fss.or.kr/
- Filing search `list.json`: https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019001
- Corp code download `corpCode.xml`: https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019018
- Company profile `company.json`: https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002
- Single company major accounts `fnlttSinglAcnt.json`: https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019016
- Single company full financial statements `fnlttSinglAcntAll.json`: https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019020

Confirmed OpenDART behavior:

- `crtfc_key` is a required private API key for all endpoints in this recipe.
- OpenDART JSON responses include `status` and `message`; status `000` is success.
- Common non-success statuses include `010` unregistered key, `011` disabled key, `012` blocked IP, `013` no data, `020` request limit exceeded, and `021` too many companies.
- Filing search `page_count` has maximum 100.
- `corpCode.xml` returns Zip FILE (binary). Do not convert the full Zip response to JSON/base64 in PocketBase.

## Choose The Recipe

| User request | Use | Notes |
| --- | --- | --- |
| Search DART filings, show company profile, or show financial statement rows | `filings-and-financials/README.md` | Uses JSON OpenDART APIs through a PocketBase route. |
| Download and parse the full corp-code list | `filings-and-financials/README.md` | Route returns `/api/opendart/corp-codes.zip` as a binary blob; parse in the browser or a follow-up import flow. |
| Show DART document viewer links | `filings-and-financials/README.md` | Use `rcept_no` from API results to build `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=<rcept_no>`. |
| Call paid/private financial vendors | Do not implement from this recipe | Add a separate provider recipe after checking that provider's official API docs and credential policy. |

## Credential Request

Use `miso_env_vars_request` before writing code that depends on a missing OpenDART key:

```ts
{
  title: "Connect OpenDART",
  description: "Enter the OpenDART API key issued from opendart.fss.or.kr.",
  variables: [
    {
      key: "OPENDART_API_KEY",
      label: "OpenDART API key",
      target: "backend",
      secret: true,
      required: true
    }
  ]
}
```

## MISO Runtime Rules

- Do not expose `OPENDART_API_KEY` as `VITE_...`.
- Do not ask the user to paste the OpenDART key into chat.
- Do not call `https://opendart.fss.or.kr` directly from React. Browser calls go to the local runtime route with `getRuntimeBase()`.
- Backend routes must load `require(__hooks + "/_runtime_env.js")` and `require(__hooks + "/_runtime_proxy.js")` inside the route handler.
- Backend routes must call `runtimeProxy.proxyFetch`; do not use `$http.send`.
- PocketBase hook code is Goja/CommonJS. Do not use npm packages, Node APIs, `import`, `export`, or `async`/`await` in `*.pb.js`.
- `secret: true` backend env values are managed placeholders inside PocketBase; use the key only as an outbound `proxyFetch` request value and do not log or locally compare it.
- For `corpCode.xml`, return bytes with `e.blob(200, "application/zip", body)` and parse the Zip outside the route.

## Verification

1. Request `OPENDART_API_KEY` with `miso_env_vars_request`.
2. Copy `filings-and-financials/opendart.pb.js` into the app `api/` folder.
3. Start with `GET ${getRuntimeBase()}/api/opendart/company?corpCode=00126380` and confirm a JSON response with OpenDART status `000`.
4. Test `GET ${getRuntimeBase()}/api/opendart/filings?corpCode=00126380&pageCount=10`.
5. Test `GET ${getRuntimeBase()}/api/opendart/corp-codes.zip` and confirm the response is binary Zip bytes, not JSON or HTML.
6. If OpenDART returns `010`, `011`, `012`, or `020`, fix the OpenDART key/IP/quota state. Do not rewrite the feature as browser-direct fetch or sandbox `curl`.
