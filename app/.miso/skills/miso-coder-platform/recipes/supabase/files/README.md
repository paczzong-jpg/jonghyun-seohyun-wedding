# Supabase Storage Files

## Use When

Use this recipe when the user wants the generated website app to upload browser-selected files to Supabase Storage or show download links for files already stored there.

Do not use this for PocketBase file fields, local uploaded document parsing, or data.go.kr file downloads. Use the matching file/binary recipe for those surfaces.

## Official Docs To Check

- Storage bucket fundamentals: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Upload a file: https://supabase.com/docs/reference/javascript/storage-from-upload
- Retrieve public URL: https://supabase.com/docs/reference/javascript/storage-from-getpublicurl
- Create signed URL: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl

## Required Setup

1. Read `recipes/supabase/README.md`.
2. Copy `recipes/supabase/supabaseClient.ts` to `src/lib/supabaseClient.ts`.
3. Confirm the bucket already exists.
4. Confirm upload restrictions such as max size and allowed content types.
5. Confirm Row Level Security policies on Storage objects allow the required action.

Supabase Storage has public buckets and private buckets. Public buckets can return public asset URLs, but upload/delete/move/copy still need policies. Private buckets require an authorized download or a signed URL.

## Implementation

Copy `SupabaseStorageUploader.tsx` into a component path such as `src/components/SupabaseStorageUploader.tsx`, then replace:

- `BUCKET` with the real bucket name.
- Path construction with the app's ownership model, such as `users/<user-id>/...`.
- Accepted file types and max file size validation.

The example uploads the browser `File` object directly. Do not read files with text tools, base64 JSON, `readAsText`, or shell commands.

## Verification

- Upload succeeds for an allowed file type and fails clearly for a blocked file type.
- Public bucket download uses `getPublicUrl`.
- Private bucket download uses `createSignedUrl`.
- No backend-only Supabase key appears in browser code.
- File paths include enough ownership information to avoid collisions between users.
