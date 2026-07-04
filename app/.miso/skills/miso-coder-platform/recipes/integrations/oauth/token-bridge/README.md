# Integration OAuth Token Bridge

Use this only when PocketBase cannot be configured directly with the desired OAuth provider and the app receives a token from an external identity flow.

Prefer built-in PocketBase OAuth for Google, Microsoft Entra, GitHub, and other supported providers. A bridge is more complex because the backend must verify the external token before issuing a PocketBase token.

This recipe is under `recipes/integrations/oauth` because it connects to an external identity system. PocketBase-owned provider login belongs under `recipes/pocketbase/auth`, and MISO login belongs under `recipes/miso/auth`.

Official references:

- PocketBase auth: https://pocketbase.io/docs/authentication/
- PocketBase record/token APIs: https://pocketbase.io/docs/js-records/

## Required Contract

External token bridge is backend-only:

1. Frontend gets an access token from the external provider flow.
2. Frontend posts the token to `${getRuntimeBase()}/api/auth/external-token`.
3. `api/external-auth.pb.js` calls a trusted userinfo or introspection endpoint through `proxyFetch`.
4. The route verifies provider claims.
5. The route upserts a PocketBase auth record and returns `record.newAuthToken()`.
6. Frontend calls `pb.authStore.save(token, record)` with the returned values.

Do not decode a JWT and trust it without signature validation. If the provider only gives an ID token and has no userinfo/introspection endpoint, do not implement a bridge inside Goja unless you have a supported signature-validation path.

## Runtime Env

Set backend-only runtime env values. Do not use `VITE_*` for provider secrets.

| Env | Required | Meaning |
| --- | --- | --- |
| `EXTERNAL_AUTH_USERINFO_URL` | yes | HTTPS endpoint that validates the bearer token and returns user claims. |
| `EXTERNAL_AUTH_COLLECTION` | no | PocketBase auth collection, defaults to `users`. |
| `EXTERNAL_AUTH_AUDIENCE` | no | Expected `aud` or `audience` claim when the endpoint returns one. |
| `EXTERNAL_AUTH_PROVIDER` | no | Label for logs/errors, defaults to `external`. |

In PB hooks, `_runtime_env.js` is a plain object: use `runtimeEnv.EXTERNAL_AUTH_USERINFO_URL`; it is not a getter-based API.

## Copy Files

1. Copy `external-auth.pb.js` to `api/external-auth.pb.js`.
2. Confirm `api/_runtime_proxy.js` and `api/_runtime_env.js` are platform-managed files and do not edit them.
3. Frontend submit example:

```ts
import pb from "@/lib/miso-sdk/runtime-client";
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

export async function exchangeExternalToken(accessToken: string) {
  const response = await fetch(`${getRuntimeBase()}/api/auth/external-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });

  if (!response.ok) throw new Error("External auth exchange failed");
  const result = await response.json();
  pb.authStore.save(result.token, result.record);
  return result.record;
}
```

## Verification

- Missing token returns 400.
- Missing `EXTERNAL_AUTH_USERINFO_URL` returns 500.
- Invalid external token returns 401.
- Unverified email returns 403 when the provider sends `email_verified: false`.
- Valid token returns a PocketBase token and public record.
- Protected PocketBase records work with the returned auth store.
