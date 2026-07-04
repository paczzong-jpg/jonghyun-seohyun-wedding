# Kakao Talk Channel Webhook Recipe

## When To Use

Use this to receive Kakao Talk Channel add/block callbacks.

## Files

1. Copy `kakao-channel-webhook.pb.js` to `api/kakao-channel-webhook.pb.js`.
2. Register this published callback URL:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/kakao/channel-webhook
```

## Verification Strategy

Kakao sends `Authorization: KakaoAK <SERVICE_APP_ADMIN_KEY>`. Current MISO `secret: true` backend env values are managed placeholders inside PocketBase, so local comparison requires `KAKAO_ADMIN_VERIFIER` as a backend-readable verifier or an app-level IP allowlist.

If neither is configured, the route still acknowledges the callback but should not be used for sensitive state changes.

## Verification

- Kakao receives `2XX` within 3 seconds.
- `event` is `added` or `blocked`.
- If MISO returns `403`, check app IP restriction first.
