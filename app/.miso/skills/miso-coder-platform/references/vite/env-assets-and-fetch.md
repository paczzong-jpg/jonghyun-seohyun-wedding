# Vite Env, Assets, And Fetch

## Official Docs

- Vite env and modes: https://vite.dev/guide/env-and-mode
- Vite plugin API: https://vite.dev/guide/api-plugin.html

## Environment Variables

- Browser-visible variables must use the `VITE_` prefix.
- Anything referenced through `import.meta.env` is bundled into browser code and should be treated as public.
- Public API keys, such as an API's publishable key or Supabase publishable/legacy anon key, can be used in browser code only when the external service's authorization model makes that safe.
- Secret keys belong in PocketBase hook code, read through platform runtime env helpers, and used through `proxyFetch`.
- Do not log environment values or API keys.

## External Fetch From Browser

Browser code can call public external URLs directly with `fetch`. The platform handles its browser proxy behavior under the hood; app code should still look like normal browser fetch code.

```ts
const response = await fetch("https://api.example.com/public/items");
if (!response.ok) throw new Error(`Request failed: ${response.status}`);
const data = await response.json();
```

For `FormData`, do not set `Content-Type` manually; the browser must include the multipart boundary. Streaming responses can use normal `ReadableStream` APIs when the external API supports them.

Do not add Express, Fastify, Hono, `http-proxy-middleware`, or CORS bypass packages for external browser calls. Use the browser route for public APIs and the PocketBase hook route for secrets.

## Assets

- Use normal Vite static imports for source-controlled assets.
- Do not read binary uploads with text tools.
- User-selected files should be handled as browser `File` or `Blob` objects.

## Decision Table

| Value type | Surface |
| --- | --- |
| Public base URL | `import.meta.env.VITE_*` |
| Public browser-safe key | `import.meta.env.VITE_*` |
| Server credential | PocketBase hook runtime env |
| User-uploaded file | Browser `File`, MISO upload, or PocketBase file field |

## Verification

- If a browser env value is `undefined`, check the `VITE_` prefix and restart assumptions first. Do not restart the managed dev server.
- If a secret appears as a placeholder in hook code, use `diagnostics/env-secret-undefined-or-placeholder.md`.
- Never log env values or API keys while debugging.
