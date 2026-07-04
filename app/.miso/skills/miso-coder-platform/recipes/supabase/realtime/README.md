# Supabase Realtime

## Use When

Use this recipe when the user wants the browser UI to update as Supabase table rows change.

This recipe uses Postgres Changes because it is the shortest generated-app path. Supabase documents Broadcast as the more scalable and secure approach for higher-volume realtime features; if the requirement is high-frequency collaboration or many concurrent users, check the official Realtime docs before implementing.

## Official Docs To Check

- Realtime overview: https://supabase.com/docs/guides/realtime
- Subscribing to database changes: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- Postgres Changes: https://supabase.com/docs/guides/realtime/postgres-changes
- JavaScript subscribe: https://supabase.com/docs/reference/javascript/subscribe
- JavaScript removeChannel: https://supabase.com/docs/reference/javascript/removechannel

## Required Setup

1. Read `recipes/supabase/README.md`.
2. Copy `recipes/supabase/supabaseClient.ts` to `src/lib/supabaseClient.ts`.
3. Confirm the table is added to the `supabase_realtime` publication.
4. Confirm Row Level Security allows the subscribing role to read the rows that should be visible.

Realtime does not make private data safe by itself. Treat it like another browser read surface.

## Implementation

Copy `SupabaseRealtimeList.tsx` into a component path such as `src/components/SupabaseRealtimeList.tsx`, then replace:

- Channel name.
- Table name.
- Row type and column list.
- State update logic for the target UI.

Always remove the channel in React cleanup. Leaked channels can duplicate events after component remounts.

## Verification

- Initial load succeeds with a normal `select`.
- Inserting/updating/deleting a row in Supabase changes the UI without a manual refresh.
- Browser console does not show `CHANNEL_ERROR` or `TIMED_OUT`.
- No backend-only key is used in the browser.
- For permission errors, return to `diagnostics/supabase-rls-or-key-fails.md`.
