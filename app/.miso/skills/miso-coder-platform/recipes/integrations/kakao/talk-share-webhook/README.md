# Kakao Talk Share Webhook Recipe

## When To Use

Use this to receive Kakao Talk Share delivery callbacks.

## Files

1. Copy `kakao-talk-share-webhook.pb.js` to `api/kakao-talk-share-webhook.pb.js`.
2. Register this published callback URL:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/kakao/talk-share-webhook
```

Kakao Talk Share webhook can be GET or POST depending on provider settings. The snippet registers both.

## Verification

- The route returns `2XX` within 3 seconds.
- Kakao SDK calls include `serverCallbackArgs`; otherwise Kakao has no custom parameters to send back.
- If MISO returns `403`, check app IP restriction first.
