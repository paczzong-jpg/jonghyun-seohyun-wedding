# Dependency Or Command Denied

## Symptoms

- Package install fails.
- Command is denied by sandbox policy.
- A suggested workaround cannot run.

## Common Wrong Diagnosis

Editing package-manager policy files or repeatedly retrying the same denied command.

## First Checks

1. Read the denial message.
2. Check whether the package is too new for the 14 day gate.
3. Check existing dependencies.
4. Choose a supported command path.

## Commands Or Files To Inspect

- `package.json`
- `pnpm-workspace.yaml`
- `references/sandbox/dependency-and-package-policy.md`
- `references/sandbox/allowed-commands-and-denied-commands.md`

## Commands Or Files Not To Use

- Shell wrappers.
- Inline eval shortcuts.
- Dev-server start commands.
- Lockfile edits.
- `.npmrc` edits.

## Decision Tree

- Package too new: choose older stable allowed version.
- Package not needed: use existing dependency or platform helper.
- Command denied: use a direct supported command or log surface.
- Hook needs package: redesign because hooks cannot load npm packages.

## Fix Path

Stay inside sandbox policy and use existing platform surfaces.

## Verification

Confirm the chosen command runs and no managed package files changed unintentionally.

## Return To Recipe

Return to the feature recipe after dependency or command choice is resolved.
