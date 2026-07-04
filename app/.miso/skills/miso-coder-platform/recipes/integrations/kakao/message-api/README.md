# Kakao Talk Message API Recipe

## When To Use

Use this when a user-granted Kakao access token should send a Kakao Talk Message API request, such as "send to me".

This recipe does not implement Kakao Login. It assumes the app already obtained a user access token through an approved Kakao Login flow with the required consent item, such as `talk_message`.

## Files

1. Copy `kakao-message-api.pb.js` to `api/kakao-message-api.pb.js`.
2. Copy `KakaoMemoSender.tsx` only when you already have a Kakao user access token in the frontend flow.
3. Frontend code must call `${getRuntimeBase()}/api/kakao/message/send-me`; do not call raw `/api/...` because MISO preview can route it to the Vite SPA fallback instead of PocketBase.

## Route Contract

`POST /api/kakao/message/send-me`

```json
{
  "accessToken": "user-access-token",
  "templateObject": {
    "object_type": "text",
    "text": "Hello",
    "link": { "web_url": "https://example.com", "mobile_web_url": "https://example.com" }
  }
}
```

## Verification

- Kakao app has Kakao Login activated.
- User consent includes `talk_message`.
- The route uses `application/x-www-form-urlencoded;charset=utf-8`.
- Do not use the admin key for user message APIs.
