# Vite Browser Error

## Symptoms

- Blank screen.
- Component does not render.
- Browser action silently fails.
- Console/runtime error appears in the sandbox.

## Common Wrong Diagnosis

Assuming the Vite dev server must be restarted or reconfigured.

## First Checks

1. Inspect `/workspace/.coder/errors.jsonl`.
2. Identify the latest stack trace and file path.
3. Separate import errors, render errors, network errors, and data shape errors.

## Commands Or Files To Inspect

- `/workspace/.coder/errors.jsonl`
- Changed `src/**/*.tsx`
- `src/lib/miso-sdk/` only for signatures, not edits

## Commands Or Files Not To Use

- Dev-server start or restart commands.
- `vite.config.ts`.
- Process/port inspection commands.

## Decision Tree

- Import error: fix the import path or exported name.
- Render error: guard nullable data and add loading/error states.
- Network error: move to external API or MISO SDK diagnostic.
- PocketBase error: move to PocketBase diagnostic.

## Fix Path

Patch the app-owned frontend file. Keep the fix scoped to the failing surface.

## Verification

Recheck `/workspace/.coder/errors.jsonl` and verify the UI path that triggered the error.

## Return To Recipe

Return to the recipe that owns the feature.
