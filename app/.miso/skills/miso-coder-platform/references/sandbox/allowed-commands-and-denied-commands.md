# Allowed And Denied Commands

## Safe Command Classes

- Read text files with normal text tools.
- Search text with `rg`.
- Run existing project checks that do not restart managed services.
- Use `curl` against documented internal runtime endpoints (the `${SM_INTERNAL_URL}` paths) — never against external domains.
- Run `.miso/bin/pb-typegen` after schema changes.

## Denied Command Classes

Confirmed denied classes in `opencode.json` and `coder-permissions.shared.js`:

- Process killers.
- Port/process inspectors.
- Shell-wrapper commands.
- Inline eval commands for Node, Python, Perl, or Ruby.
- Dev-server start or restart commands.
- Lockfile mutation commands.
- Destructive `.miso` deletion.
- Direct `curl`/`wget`/`fetch` to external domains. The sandbox has no CA bundle (TLS fails) and bypasses the SM proxy; route external calls through a PocketBase `proxyFetch` route, and use a temporary `_probe` route to explore a source.

## Package Policy

`pnpm-workspace.yaml` sets `minimumReleaseAge: 20160`, which means 14 days. The internal NPM and PyPI registry proxies also enforce a 14 day age gate. If package installation fails because a version is too new, choose an older allowed version or use an existing dependency. Do not edit package-manager config or lockfiles to bypass the gate.

## Verification

- If a command is denied, read the denial and choose a supported surface.
- If a package is unavailable, inspect existing dependencies and official package age rather than retrying the same install path.
