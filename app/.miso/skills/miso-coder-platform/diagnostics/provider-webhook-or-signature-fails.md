# Provider Webhook Or Signature Fails

Use this diagnostic when Slack slash commands/events, Kakao callbacks, Notion webhooks, or other provider-to-app requests do not reach the generated app.

## First Determine Where It Failed

| Symptom | Likely layer | Action |
| --- | --- | --- |
| Provider reports URL unreachable or receives 404 | Published site gate | Confirm `/site/<site_code>/__runtime/api/...` URL, published status, and no provider-side redirect |
| Provider receives 401 | MISO app permission | The app is not external/public; provider requests have no MISO login cookies |
| Provider receives 403 before any PocketBase log | MISO app IP restriction or tenant deny list | Add provider source IP/CIDR to app IP restrictions or disable the restriction for that app |
| PocketBase route logs but provider rejects signature | Route verification | Check raw body, timestamp, signing secret shape, and exact provider docs |
| Route responds after provider timeout | Route work too slow | Acknowledge first, then do slow work asynchronously or through callback if the provider supports it |

## MISO Runtime Constraints

- Webhook URL path is `/site/<site_code>/__runtime/api/<provider>/<capability>` in published mode.
- The provider cannot call MISO-login-protected apps unless the provider can authenticate as a MISO user, which normal provider webhooks cannot.
- `secret: true` backend env values are managed placeholders inside PocketBase. They work for outbound `proxyFetch`, but not for local HMAC or header comparison.
- If local signature verification needs a raw secret, use a backend value intentionally available to PocketBase code and keep it out of browser files. Prefer a future platform inbound-secret helper when available.
- For Slack signatures, use `recipes/integrations/slack/verification/README.md`: read `readerToString(e.request.body)` before `e.requestInfo()` and compute `v0:<timestamp>:<rawBody>`.
- For Kakao webhook headers, use `recipes/integrations/kakao/callback-verification/README.md`: compare the expected `Authorization: KakaoAK ...` only if the route has an actual backend-readable verifier; otherwise rely on MISO IP restriction and provider URL secrecy.
- For GitHub webhooks, use `recipes/integrations/github/webhook/README.md`: verify `X-Hub-Signature-256` with `sha256=` + HMAC-SHA256 over raw body.
- For Stripe webhooks, use `recipes/integrations/stripe/webhook/README.md`: verify `Stripe-Signature` `t`/`v1` against HMAC-SHA256 over `timestamp.rawBody`.
- For Teams outgoing webhooks, use `recipes/integrations/teams/outgoing-webhook/README.md`: verify `Authorization: HMAC <base64>` using the base64-decoded Teams HMAC security token and raw body.

## Do Not

- Do not debug provider webhooks by calling the provider API from a sandbox shell.
- Do not switch from `proxyFetch` to `$http.send` for outbound follow-up calls.
- Do not mark a signing secret `secret: true` and then compare it inside PocketBase; that compares a managed placeholder.
- Do not return HTML or SPA fallback from webhook routes.
- Do not perform LLM calls, large imports, or slow external calls before acknowledging Slack/Kakao webhooks.

## Verification

- Hit the exact published route with a harmless test request and confirm it returns JSON, not HTML.
- Check provider dashboard delivery logs for status code and response body.
- Check PocketBase route logs only after the site gate status is not 401/403/404.
- Confirm route code uses handler-local helpers and no top-level helper functions.
- If the provider is Slack, Kakao, GitHub, Stripe, or Teams, compare the route against the provider-specific `*.pb.js` recipe before making ad hoc changes.
