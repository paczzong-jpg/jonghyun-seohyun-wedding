# PocketBase Hook Not Loading

## Symptoms

- Route returns 404.
- Hook behavior does not run after saving `api/*.pb.js`.
- PocketBase logs mention syntax or module errors.
- PocketBase logs show `Illegal return statement` and the runtime crash-loops (restarts repeatedly).
- PocketBase process logs or runtime state mention `pocketbase_hook_load_failed`.
- Request-time error `<name> is not defined`.

## Common Wrong Diagnosis

Restarting Vite or editing managed runtime files.

## First Checks

1. Confirm filename ends with `.pb.js`.
2. Confirm file is under `api/`.
3. Check PocketBase logs.
4. Check for unsupported JavaScript syntax.

## Commands Or Files To Inspect

- `api/*.pb.js`
- `/workspace/.pocketbase/prod/runtime_state/last_hook_error.json`
- `/workspace/.pocketbase/prod/runtime_state/last_hook_error.log`
- `/workspace/.pocketbase/prod/runtime_state/quarantine/*/pocketbase.log`
- `/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/logs`
- `/internal/coder/apps/${RUNTIME_APP_ID}/logs?service=pocketbase`
- `api/README.md`

## Commands Or Files Not To Use

- Dev-server restart commands.
- `api/_runtime_proxy.js` edits.
- npm imports in hooks.
- Node or Python inline eval workarounds.

## Decision Tree

- Filename wrong: rename to `*.pb.js`.
- Syntax uses `import`, `export`, or async functions: rewrite to Goja/CommonJS style.
- `Illegal return statement` on load: a `return` sits at file scope (outside a handler). Move it into the `routerAdd` callback — the file must be only `routerAdd(...)` calls.
- `Object has no member 'requireGuestAuth'`: replace `$apis.requireGuestAuth()` with a valid PocketBase 0.31 middleware. Use `$apis.requireGuestOnly()` only for guest-only routes, `$apis.requireAuth()` for authenticated routes, `$apis.requireSuperuserAuth()` for superuser routes, or omit middleware if both signed-in and unsigned visitors are allowed.
- `pocketbase_hook_load_failed`: the platform rolled back to the last known good hook snapshot or an empty hook snapshot so PocketBase can keep serving. Read `/workspace/.pocketbase/prod/runtime_state/last_hook_error.json` first, then inspect the matching quarantine log if more stack trace is needed. Fix the source hook under `api/`, save it, and re-check the PocketBase process logs.
- `<name> is not defined` at request time: a file-scope helper/constant is called from the handler. Inline every helper, constant, and `require(...)` inside the handler.
- Missing proxy helper: require `_runtime_proxy.js` inside the handler.
- Route still 404: confirm route path and method.

## Fix Path

Patch the hook file, save it, and check logs for reload.

## Verification

Call the route or trigger the hook and confirm logs no longer show load errors.

## Return To Recipe

Return to `recipes/miso/external-api/pocketbase-hook/README.md` or `recipes/pocketbase/crud/README.md`.
