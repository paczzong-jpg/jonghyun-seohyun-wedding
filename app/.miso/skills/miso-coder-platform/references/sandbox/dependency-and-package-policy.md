# Dependency And Package Policy

## Confirmed Policy

The generated app template and coder workspace enforce package-age and build-safety policy:

- `tools-external/coder/pnpm-workspace.yaml`: `minimumReleaseAge: 20160`
- `tools-external/coder/template/pnpm-workspace.yaml`: `minimumReleaseAge: 20160`
- `tools-external/coder/src/routes/internal-registry-npm.ts`: 14 day NPM metadata filter
- `tools-external/coder/src/routes/internal-registry-pypi.ts`: 14 day PyPI metadata filter

`20160` is minutes, so the package age gate is 14 days.

## What To Do When Install Fails

1. Check whether an existing dependency already covers the need.
2. Choose a stable version older than the age gate.
3. Prefer platform-provided helpers over new packages when the helper exists.
4. Report when the requested library is blocked by policy.

## What Not To Do

- Do not edit `.npmrc`.
- Do not edit lockfiles.
- Do not change package manager policy files.
- Do not use inline eval commands as a workaround.
- Do not add a backend package to PocketBase hooks; hooks cannot load npm packages.

## Verification

- Check `package.json` for existing dependencies.
- Check package-manager error output for age or build-script policy messages.
- Keep dependency changes minimal and scoped to the feature.
