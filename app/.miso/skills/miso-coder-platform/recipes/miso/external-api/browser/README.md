# External API From Browser

## When To Use

Use this for public external APIs or APIs whose browser-visible key is safe by design.

## When Not To Use

Do not use browser fetch for private API keys, service credentials, signed headers, or APIs that must hide request details from users. Use `recipes/miso/external-api/pocketbase-hook/README.md` instead.

## Required References

- `references/vite/env-assets-and-fetch.md`
- Official Vite env docs: https://vite.dev/guide/env-and-mode

## Implementation

```tsx
import { useState } from "react";

export function PublicApiPanel() {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("https://api.example.com/public/items");
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <button onClick={load} disabled={loading}>
        {loading ? "Loading" : "Load"}
      </button>
      {error && <p>{error}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </section>
  );
}
```

## Env Handling

Use `import.meta.env.VITE_PUBLIC_NAME` only for public values. Treat every `VITE_*` value as visible to users.

If a value is private, signed, or service-scoped, stop and use `recipes/miso/external-api/pocketbase-hook/README.md`.

## Supported Browser Patterns

- Standard `fetch` with GET, POST, PUT, PATCH, and DELETE.
- JSON request bodies with `Content-Type: application/json`.
- `FormData` uploads. Do not set `Content-Type` manually; the browser must add the multipart boundary.
- `application/x-www-form-urlencoded` bodies.
- Streaming or chunked responses through `response.body.getReader()` when the upstream API supports them.
- Axios only when already present or explicitly useful; no proxy configuration is needed.

## Verification

- Confirm loading and error states render.
- Confirm no private key is present in browser source.
- Check `/workspace/.coder/errors.jsonl` for runtime errors.

## Diagnostic Handoff

Use `diagnostics/external-api-auth-cors-or-proxy-fails.md` for failed requests.

## Common Wrong Paths

- Adding a custom server.
- Hardcoding keys in source.
- Moving a private key into `VITE_*`.
- Installing CORS proxy middleware.
- Logging API keys or env values.
- Setting `Content-Type` manually for `FormData`.
