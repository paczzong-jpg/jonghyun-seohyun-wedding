# External Provider Integrations

Use this folder for provider APIs and webhooks that are not MISO platform SDKs and not app-login recipes. Keep the structure provider-first:

```text
recipes/integrations/
├── google/
├── notion/
├── slack/
├── kakao/
├── naver/
├── openstreetmap/
├── dooray/
├── opendart/
├── snowflake/
├── databricks/
├── tableau/
├── powerbi/
├── github/
├── stripe/
├── teams/
├── email/
└── oauth/
```

Do not create a top-level `messaging/` or `maps/` recipe family. Slack, Kakao, Naver, OpenStreetMap, Dooray, OpenDART, GitHub, Stripe, Teams, Gmail, Resend, SendGrid, Notion, Snowflake, Databricks, BigQuery, Tableau, and Power BI are provider integrations with different credential, webhook, and verification rules.

## Surface Rules

| Surface | Correct MISO implementation |
| --- | --- |
| Browser-safe provider SDK or public key | Vite component with `VITE_*` env only |
| Browser map SDK key protected by domain allowlist | Vite component with `VITE_*` env only; register preview and published origins in the provider console |
| Provider API key, bot token, incoming webhook URL, service role, admin REST call | PocketBase `api/*.pb.js` route using `runtimeProxy.proxyFetch` |
| Provider webhook or slash command calling the app | Published site URL under `/site/<site_code>/__runtime/api/<provider>/...` |
| Provider OAuth login for app users | Provider-specific auth recipe, not this folder unless the provider token is only for API access |
| User-delegated provider account through MISO personal connectors | Do not implement yet; MISO connector OAuth is unavailable in the current API rollout |
| Existing MISO user/session | `recipes/miso/auth/README.md` |

Frontend code should call local runtime routes such as `/api/slack/message` or `/api/notion/pages`. In published mode the platform maps that to `/site/<site_code>/__runtime/api/...`. Do not call provider REST APIs directly from the browser when a secret, token, webhook URL, or server validation is involved.

## OAuth Redirect URL Rule

OAuth redirect callbacks are provider-to-browser control-plane URLs. They are not outbound API calls.

MISO personal connector OAuth is currently unavailable in the API rollout. Do not use `recipes/miso/connectors/README.md`, `miso-connectors.ts`, `/__api/auth/connectors/*`, connector grants, connector tokens, or `connectorAuth` in generated app work.

When the restriction is removed, MISO personal connectors should not create a per-app redirect route. Register the canonical callback URL shown in Admin V2 personal connector OAuth settings:

```text
https://api.<customer-domain>/api/auth/connectors/callback
```

The generated website app would call `/__api/auth/connectors/*`; Flask handles login-user vs external-visitor identity internally. Do not implement this path while connector OAuth is unavailable.

When a provider asks for a redirect URI, register the exact callback route for both preview and published mode:

```text
preview callback URL for a frontend route:
https://<miso-origin>/service/coder/preview/<app_id>/<callback-path>

preview callback URL for a PocketBase route:
https://<miso-origin>/service/coder/preview/<app_id>/__runtime/api/<provider>/<callback-route>

published callback URL for a frontend route:
https://<miso-origin>/site/<site_code>/<callback-path>

published callback URL for a PocketBase route:
https://<miso-origin>/site/<site_code>/__runtime/api/<provider>/<callback-route>
```

The `site_code` is unknown during development, so implement a stable callback path, test with the preview callback URL, and tell the user to add the published URL in the provider console after publishing. Providers usually match the full redirect URI exactly; a preview-only URL will fail after publish.

The app-visible browser outbound proxy is `/__external/...` in preview and `/site/<site_code>/__external/...` after publish. Internally this reaches the Session Manager `browser-proxy` route. `browser-proxy` is an outbound external-request proxy, not a redirect URI or callback handler.

## Credential Request Rule

Use `miso_env_vars_request` before coding against missing values.

- Use `target: "backend", secret: true` for outbound credentials that are only passed to `proxyFetch` such as `SLACK_BOT_TOKEN`, `SLACK_WEBHOOK_URL`, `NOTION_API_KEY`, `RESEND_API_KEY`, or `SENDGRID_API_KEY`.
- Use `target: "frontend", secret: false` only for public browser keys such as OAuth client IDs or JavaScript SDK app keys.
- For Naver/Kakao map JavaScript keys, use frontend env names that describe the public browser client value, not a backend secret. Do not place REST API keys used for server-side geocoding into map UI components.
- Do not ask the user to paste secrets into chat.

Inbound webhook verification is different. Current MISO PocketBase runtime stores `secret: true` backend env values as managed placeholders; the real value is substituted only during `proxyFetch` outbound calls. A PocketBase route cannot compute HMAC or compare an inbound header with a `secret: true` value. For inbound verification, either:

1. Rely on MISO app-level IP restriction when the provider source IP range can be registered.
2. Use a backend value intentionally available to PocketBase code, documented as a raw verifier, and never expose it to browser code.
3. Add a platform inbound-secret verifier before claiming provider HMAC support.

Do not silently compare Slack/Kakao signatures against a managed placeholder. That produces false failures and makes the agent chase headers.

## Inbound Verification Recipes

Use the provider recipe before writing custom verification code:

| Provider | Recipe | Verification |
| --- | --- | --- |
| Slack | `slack/verification/README.md` | `X-Slack-Signature` over `v0:<timestamp>:<rawBody>` with `SLACK_SIGNING_SECRET_RAW` |
| Kakao | `kakao/callback-verification/README.md` | Optional `Authorization: KakaoAK <admin-key>` check with `KAKAO_ADMIN_KEY_RAW`, or MISO IP restriction |
| GitHub | `github/webhook/README.md` | `X-Hub-Signature-256` over raw body with `GITHUB_WEBHOOK_SECRET_RAW` |
| Stripe | `stripe/webhook/README.md` | `Stripe-Signature` `t`/`v1` check over `timestamp.rawBody` with `STRIPE_WEBHOOK_SECRET_RAW` |
| Teams | `teams/outgoing-webhook/README.md` | `Authorization: HMAC <base64>` over raw body with base64 key `TEAMS_OUTGOING_WEBHOOK_HMAC_KEY_RAW` |

Every recipe includes a copyable `*.pb.js` route. Keep those helpers inside the `routerAdd` handler and read the raw body before parsing.

## Inbound URL Pattern

For webhooks, slash commands, Kakao chatbot skills, and callback receivers:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/<provider>/<capability>
```

Requirements:

- The website app must be published.
- The app must be external/public if the provider calls without MISO cookies.
- If the tenant/app has IP restrictions, the provider source IPs must be allowed or the platform will return `403` before PocketBase logs appear.
- The provider must support the registered URL without redirects. Kakao webhook docs explicitly require no redirect.

## Verification Checklist

- Browser code contains no backend key names.
- Backend route uses `require(__hooks + "/_runtime_proxy.js")` inside the handler and calls `proxyFetch`.
- Backend route uses `require(__hooks + "/_runtime_env.js")` inside the handler for env values.
- Incoming provider routes respond within the provider SLA before doing slow work.
- Inbound failures are diagnosed at the site gate first: 404 unpublished/site code, 401/403 permission/IP restriction, then PocketBase route logs.
- Official provider docs linked in the selected provider recipe were checked for current endpoint, scope, timeout, rate limit, and payload contract.
