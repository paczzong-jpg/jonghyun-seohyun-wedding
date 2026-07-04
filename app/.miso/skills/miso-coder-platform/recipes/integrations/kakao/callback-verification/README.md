# Kakao Callback Verification

Use this recipe when Kakao calls a generated MISO website app: Kakao Talk Channel callbacks, Talk Share callbacks, or Kakao Login unlink webhooks.

## Official Docs To Check

- Kakao Talk Channel webhook: https://developers.kakao.com/docs/en/kakaotalk-channel/callback
- Kakao Talk Share webhook: https://developers.kakao.com/docs/latest/en/kakaotalk-share/callback
- Kakao webhooks overview: https://developers.kakao.com/docs/en/getting-started/callback

## MISO Route

Register Kakao with the published URL for the selected callback:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/kakao/<capability>
```

The app must be external/public if Kakao calls without MISO cookies. If MISO IP restriction is enabled, allow Kakao source IP/CIDR or Kakao receives `403` before PocketBase route logs. Kakao callback URLs must not redirect.

## Verification Choices

Kakao callbacks commonly use `Authorization: KakaoAK <SERVICE_APP_ADMIN_KEY>` for header verification. PocketBase can compare that header only if it has the actual admin key locally.

- Prefer MISO app IP restriction when Kakao source IP/CIDR is known and can be registered.
- If the route must verify the header inside PocketBase, request `KAKAO_ADMIN_VERIFIER` as backend-readable.
- Do not request `KAKAO_ADMIN_KEY` as `secret: true` for local comparison. It will be a managed placeholder inside PocketBase.
- Do not name the backend-readable verifier `KAKAO_ADMIN_KEY_RAW`; high-entropy values under `*_KEY_*` can be auto-classified by Gitleaks and converted to managed placeholders.

```ts
{
  title: "Connect Kakao callback verification",
  description: "Enter Kakao callback verification values only if PocketBase must verify the callback header.",
  variables: [
    { key: "KAKAO_ADMIN_VERIFIER", label: "Kakao admin key for local callback verification", target: "backend", secret: false, required: false }
  ]
}
```

## Implementation

Copy `kakao-verified-callback.pb.js` to `api/kakao-verified-callback.pb.js`, then adapt the success branch for Channel, Talk Share, or Login unlink payloads.

## Verification

- Missing `KAKAO_ADMIN_VERIFIER` means the route accepts the request and relies on MISO site gate/IP restriction.
- Present `KAKAO_ADMIN_VERIFIER` means invalid `Authorization` returns `401`.
- Valid callback returns `2XX` quickly. Do not run slow LLM/workflow work before acknowledging Kakao.
