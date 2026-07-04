# PocketBase Realtime

## When To Use

Use this when the generated app needs live updates for app-owned PocketBase records.

Do not use this for OpenCode/Coder chat SSE, MISO app streaming, Supabase Realtime, or custom server-sent events.

## Required References

- `recipes/pocketbase/README.md`
- `references/pocketbase/records-schema-and-typegen.md`
- `diagnostics/pocketbase-route-or-record-write-fails.md`

## Browser Subscription Pattern

Use the managed runtime client and the PocketBase SDK subscription API.

```ts
import pb from "@/lib/miso-sdk/runtime-client";

const unsubscribe = await pb.collection("todos").subscribe("*", (event) => {
  console.log(event.action, event.record);
});

unsubscribe();
```

Subscribe inside `useEffect`, track cancellation, and call `unsubscribe()` during cleanup.

## Forbidden Direct Paths

Do not call realtime HTTP endpoints directly. These paths are not app routes and can return 404 through the Coder server:

```ts
fetch("/realtime/subscriptions", { method: "POST" });
fetch("/api/realtime/...");
```

Do not create a custom route handler for `/realtime/...` to hide the error. The runtime proxy already handles the PocketBase SDK realtime channel.

## Verification

- Browser code imports `pb` from `@/lib/miso-sdk/runtime-client`.
- Subscription uses `pb.collection("...").subscribe("*", handler)`.
- Cleanup calls `unsubscribe()`.
- The collection rules allow the active user/session to list or view the subscribed records.
- Realtime failures are not diagnosed by restarting Vite.

## Common Wrong Paths

- Direct `fetch("/realtime/subscriptions")`.
- Direct `/api/realtime/...` calls.
- Opening a custom WebSocket or EventSource to PocketBase manually.
- Forgetting cleanup and leaving duplicate subscriptions after rerenders.
