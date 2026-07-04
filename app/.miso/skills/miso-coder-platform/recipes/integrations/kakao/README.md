# Kakao Integration Recipe

## When To Use

Use this when a generated MISO website app must serve a Kakao chatbot skill server, receive Kakao Talk Channel or Talk Share webhooks, or call Kakao Talk Message APIs.

Kakao integration is not MISO auth. It belongs under `recipes/integrations/kakao/*`.

## Official Docs To Check

- Kakao Talk Channel webhook: https://developers.kakao.com/docs/en/kakaotalk-channel/callback
- Kakao Talk Share webhook: https://developers.kakao.com/docs/latest/en/kakaotalk-share/callback
- Kakao Talk Message REST API: https://developers.kakao.com/docs/latest/en/kakaotalk-message/rest-api
- Kakao webhooks overview: https://developers.kakao.com/docs/en/getting-started/callback
- Kakao Login prerequisites: https://developers.kakao.com/docs/en/kakaologin/prerequisite
- Kakao Login REST API: https://developers.kakao.com/docs/en/kakaologin/rest-api
- Kakao chatbot skill guide: https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/make_skill
- Kakao chatbot response JSON format: https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/answer_json_format
- Kakao AI chatbot callback guide: https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/ai_chatbot_callback_guide

Use official Kakao docs for payload fields. This recipe defines the MISO route and runtime boundaries.

## MISO Can Serve Kakao Skill/Webhook URLs

Register a published MISO website route like:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/kakao/chatbot-skill
https://<miso-origin>/site/<site_code>/__runtime/api/kakao/channel-webhook
https://<miso-origin>/site/<site_code>/__runtime/api/kakao/talk-share-webhook
```

Requirements:

- The app must be published.
- The app must be external/public if Kakao calls without MISO cookies.
- If MISO app IP restriction is enabled, Kakao source IP/CIDR must be allowed. Otherwise MISO returns `403` before PocketBase logs.
- Kakao webhook URLs must not redirect.
- Kakao Channel/Talk Share webhooks require `2XX` within 3 seconds.
- Kakao chatbot skill requests have a 5 second skill timeout. Do not run slow LLM/workflow calls before returning.

## Kakao Login Redirect URLs

Kakao Login is an OAuth redirect flow. Kakao's REST API key is the OAuth `client_id`, and Kakao requires the request `redirect_uri` to match a Redirect URI registered in the Kakao Developers app.

Use `VITE_KAKAO_CLIENT_ID` for the public REST API key. Do not name it `VITE_KAKAO_REST_API_KEY`, `VITE_KAKAO_APP_KEY`, or `VITE_KAKAO_OAUTH_CLIENT_ID`.

Register the exact redirect URI for the route that actually receives Kakao's callback:

```text
preview callback URL for a frontend route:
https://<miso-origin>/service/coder/preview/<app_id>/auth/kakao/callback

preview callback URL for a PocketBase route:
https://<miso-origin>/service/coder/preview/<app_id>/__runtime/api/kakao/login/callback

published callback URL for a frontend route:
https://<miso-origin>/site/<site_code>/auth/kakao/callback

published callback URL for a PocketBase route:
https://<miso-origin>/site/<site_code>/__runtime/api/kakao/login/callback
```

The `site_code` is unknown during development, so test with the preview callback URL first and tell the user to add the published URL in the provider console after publishing. The `redirect_uri` sent to Kakao's authorize and token endpoints must exactly match the chosen callback URL.

Do not use `/__external/...`, `/site/<site_code>/__external/...`, or the internal `browser-proxy` route as a Kakao Login redirect URI. `browser-proxy` is an outbound proxy for external HTTP requests, not a redirect URI.

## Feature Choices

| User request | Recipe |
| --- | --- |
| Kakao chatbot Open Builder skill server | `chatbot-skill/README.md` |
| Kakao Talk Channel add/block callback | `channel-webhook/README.md` |
| Kakao Talk Share delivery callback | `talk-share-webhook/README.md` |
| Verify Kakao callback header before custom handling | `callback-verification/README.md` |
| Send Kakao Talk Message API request | `message-api/README.md` |

## Credential Rules

- Outbound Kakao REST calls use `proxyFetch`.
- User access tokens for Kakao Talk Message API are user-granted tokens, not app admin keys.
- Kakao Channel/Talk Share webhook verification compares `Authorization: KakaoAK <admin-key>` only if the route has a backend-readable verifier.
- Do not request `KAKAO_ADMIN_KEY` as `secret: true` if PocketBase must compare it locally; it will be a managed placeholder. Use an explicit backend-readable verifier such as `KAKAO_ADMIN_VERIFIER`, keep it out of browser code, or rely on MISO IP restriction.
- For Kakao Login browser OAuth, request the Kakao REST API key as `VITE_KAKAO_CLIENT_ID` with `target: "frontend"` and `secret: false`. The env name is intentionally client-id style because Kakao sends it as OAuth `client_id` and Gitleaks can classify names like `VITE_KAKAO_REST_API_KEY`, `VITE_KAKAO_APP_KEY`, or `VITE_KAKAO_OAUTH_CLIENT_ID` as secrets.

## Env Request

For Kakao Login browser OAuth:

```ts
{
  title: "Connect Kakao Login",
  description: "Enter the Kakao REST API key used as the OAuth client_id.",
  variables: [
    { key: "VITE_KAKAO_CLIENT_ID", label: "Kakao REST API key", target: "frontend", secret: false, required: true }
  ]
}
```

For optional inbound header verification:

```ts
{
  title: "Connect Kakao inbound callbacks",
  description: "Enter Kakao callback verification values only if this route must verify headers in PocketBase.",
  variables: [
    { key: "KAKAO_ADMIN_VERIFIER", label: "Kakao admin key for local callback verification", target: "backend", secret: false, required: false },
    { key: "KAKAO_SKILL_VERIFIER", label: "Optional chatbot skill URL verifier", target: "backend", secret: false, required: false }
  ]
}
```

For outbound REST API calls that use Kakao app admin key, create a separate route and request the admin key as `secret: true` only if it is passed to `proxyFetch`, not compared locally.

For custom callbacks, start from `callback-verification/kakao-verified-callback.pb.js` instead of comparing `Authorization` against a `secret: true` managed placeholder.

## LLM Or Workflow In Kakao Chatbot

For quick deterministic answers, a PocketBase route can respond directly.

For slow LLM, agent, or workflow answers, do not block the Kakao skill request. Kakao's callback guide allows delayed callback responses, but a PocketBase JSVM route cannot continue work after it returns. Use a first-class MISO async workflow/agent bridge or a platform worker endpoint before claiming long-running Kakao chatbot support.
