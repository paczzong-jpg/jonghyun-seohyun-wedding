# Vite Errors And Verification

## Primary Error Surface

Use `/workspace/.coder/errors.jsonl` for browser, Vite, and console error reports. This is the first check when the user says the app is blank, broken, or not responding.

## First Checks

1. Read the newest entries in `/workspace/.coder/errors.jsonl`.
2. Identify whether the failure is render, import, runtime exception, network, or data shape.
3. Fix the file that owns that failure.
4. Re-check the error file after the change.

## Do Not Use

- Dev-server restart commands.
- Port/process inspection commands.
- `vite.config.ts` edits.
- Shell wrappers or inline eval shortcuts.

## Browser Fetch Verification

For external requests, verify:

- Request URL is the real external URL or a MISO SDK helper URL, not an invented proxy path.
- Public keys are not logged.
- `response.ok` is checked.
- User-facing loading and error states exist.

## PocketBase Browser Verification

For record CRUD, verify:

- Collection exists.
- API rules are public when generated public app access is intended.
- Same-collection concurrent reads use `$autoCancel: false`.

## Return Path

- For browser render failures, return to the relevant Vite or recipe doc.
- For hook failures, switch to PocketBase diagnostics.
