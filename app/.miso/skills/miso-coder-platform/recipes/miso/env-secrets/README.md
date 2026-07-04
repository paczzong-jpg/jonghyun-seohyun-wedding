# API Keys And Secrets

## Rule

`VITE_*` means browser-visible. It is not a secret storage mechanism.

## Use Browser Env For

- Public API base URLs.
- Publishable keys designed for browser use.
- Supabase publishable key, or legacy anon key, only when RLS policies make access safe.

## Use PocketBase Hook Env For

- Private API keys.
- Bearer tokens.
- API secrets.
- Signed headers.
- Requests that should not reveal the upstream URL or headers.

## Files

- `.env` requires user approval.
- Managed credential lines must not be edited.
- `_runtime_env.js` and `_runtime_proxy.js` are platform-managed.

## User-Facing Credential Flow

If a required value is missing, use the platform credential request tool before writing code that depends on it.

Call `miso_env_vars_request` when the user needs to provide any real API key, provider credential, webhook signing secret, Supabase key, or non-secret runtime value. The tool opens a MISO-managed input card. The user submits values through that card; the agent receives only a sanitized saved message with key names and targets.

Do not ask the user to paste secret values into chat. Do not put real secret values in tool arguments, code, logs, commit messages, or final answers. Do not manually edit managed env storage.

Tool payload rules:

- `target: "frontend"` means a Vite/browser-visible value. Use it only for public base URLs and publishable/browser keys.
- `target: "backend"` means a PocketBase/backend-only value. Use it for private keys, bearer tokens, signing secrets, service credentials, and values used by hooks.
- `secret: false` for public browser values such as API base URLs and browser-publishable keys.
- `secret: true` for private values. Private values must not be referenced from browser code.
- `required: false` only when the feature can still work without that value.

Minimal request shape:

```ts
{
  title: "Connect external service",
  description: "Enter the values required for this integration.",
  variables: [
    {
      key: "VITE_PUBLIC_API_URL",
      label: "Public API URL",
      target: "frontend",
      secret: false,
      required: true
    },
    {
      key: "EXTERNAL_API_KEY",
      label: "Private API key",
      target: "backend",
      secret: true,
      required: true
    }
  ]
}
```

After the user saves the card, continue from the sanitized `[miso_env_vars_request saved]` message. If the required key was not saved, ask for the missing key with the same tool again; do not switch to chat paste.

## Verification

- Search changed browser files for private key names.
- Confirm hook logs do not print secrets.
- Confirm upstream calls using secrets go through `proxyFetch`.
- Confirm missing real values were requested through `miso_env_vars_request`.

## Common Wrong Paths

- Logging a key.
- Putting private keys in browser env.
- Inventing secret map APIs.
- Using OS env lookup for app `VITE_*` values inside hooks.
