# Vite Frontend Runtime

## Confirmed Surface

- Template: `tools-external/coder/template/package.json`
- Vite: `8.0.16`
- React: `19.2.4`
- TypeScript: `5.7.3`
- PocketBase JS SDK in browser: `0.25.2`
- Official Vite docs: https://vite.dev/guide/env-and-mode and https://vite.dev/guide/api-plugin.html

## Runtime Rules

- Frontend code runs in the browser through Vite.
- Put UI code under `src/`, normally `src/components/`, `src/hooks/`, `src/lib/`, or feature-local files.
- Do not convert the app to Next.js or add a custom Node web server.
- Do not add `React.StrictMode`; the template intentionally avoids it because double effects can conflict with PocketBase SDK auto-cancellation.
- Do not edit `vite.config.ts`; it is managed by the platform.
- Do not restart or replace the dev server. It is already managed outside the agent turn.

## PocketBase Browser Client Boundary

Use the managed client:

```ts
import pb from "@/lib/miso-sdk/runtime-client";
```

Browser code may read and write records through PocketBase collections. Browser code must not create or modify collections.

## Common Mistakes

| Mistake | Result | Correct path |
| --- | --- | --- |
| Add Express, Hono, Fastify, or Koa | Unsupported runtime | Use Vite browser code or PocketBase hooks |
| Restart the dev server | Disrupts managed runtime | Inspect error logs instead |
| Edit `vite.config.ts` | Denied managed file | Use existing Vite behavior |
| Add `StrictMode` | Duplicate effects and request cancellation | Keep existing `main.tsx` shape |

## Verification

- Inspect `/workspace/.coder/errors.jsonl` for browser/Vite runtime errors.
- Use browser-visible UI behavior and network responses.
- For data persistence, verify the PocketBase record operation separately from rendering.
