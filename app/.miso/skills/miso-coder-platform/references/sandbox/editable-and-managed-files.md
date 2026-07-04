# Editable And Managed Files

## Editable By Generated App Work

Typical editable areas:

- `src/components/`
- `src/hooks/`
- Feature-local files under `src/`
- `api/*.pb.js`
- App-specific CSS or TypeScript files that are not managed by the platform

## Managed Or Denied

Do not edit:

- `.miso/skills/**`
- `.miso/agents/**`
- `.miso/rules/**`
- `.miso/specs/**`
- `.miso/bin/**`
- `src/lib/miso-sdk/**`
- `src/components/ui/**`
- `src/lib/miso-client.ts`
- `api/_runtime_proxy.js`
- `.npmrc`
- lockfiles
- `vite.config.ts`
- `INSTRUCTIONS.md`

These denials are confirmed in `opencode.json` and `coder-permissions.shared.js`.

## Env Files

`.env` requires user approval. Do not overwrite managed credential lines. Add placeholder variables only when the user must supply a real key.

## Verification

Before editing, identify whether a file is app-owned or platform-managed. If it is managed, use the SDK/helper/API it exposes instead of changing it.
