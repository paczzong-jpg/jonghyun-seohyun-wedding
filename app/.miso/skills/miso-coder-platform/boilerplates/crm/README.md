# CRM Boilerplate

Vite React overlay for a MISO sales CRM. It ports the useful information architecture from Refine CRM into the MISO Coder app stack without adding the Refine framework or a separate backend server.

Reference source:

- Refine repository: https://github.com/refinedev/refine
- Refine CRM example: `examples/app-crm` and `examples/app-crm-minimal`
- License: MIT

## What It Provides

- Dashboard with pipeline value, weighted pipeline, stage distribution, due tasks, recent deals, and active quotes.
- Deal pipeline board with native browser drag/drop and accessible stage move buttons.
- Companies, contacts, tasks, and quotes CRUD screens.
- PocketBase runtime persistence with `crm_*` namespaced collections.
- Setup script with schema creation and MISO team seed data.
- No new package dependency.

## Copy

Copy this folder into a fresh generated app, preserving paths:

```text
api/setup_crm_collections.mjs
api/crm_hooks.pb.js
src/App.tsx
src/components/crm/*
src/lib/crm-*.ts
src/pages/*
```

Do not copy `src/components/ui`, `src/lib/miso-sdk`, config files, lockfiles, or files from an external checkout.

## Runtime Setup

Create or update the PocketBase schema:

```bash
node api/setup_crm_collections.mjs
```

Required environment:

- `SM_INTERNAL_URL`
- `RUNTIME_APP_ID` or `RUNTIME_CODEBASE_ID`

Collections created:

- `crm_companies`
- `crm_contacts`
- `crm_deals`
- `crm_tasks`
- `crm_quotes`

## Files

| File | Purpose |
| --- | --- |
| `src/lib/crm-store.ts` | PocketBase CRUD, options, dashboard aggregation |
| `src/lib/crm-config.ts` | stage/status labels, app constants, MISO team labels |
| `src/components/crm/pipeline-board.tsx` | dependency-free Kanban board |
| `src/pages/DashboardPage.tsx` | analytics overview |
| `src/pages/PipelinePage.tsx` | deals create/edit + board |
| `src/pages/CompaniesPage.tsx` | account CRUD |
| `src/pages/ContactsPage.tsx` | contact CRUD |
| `src/pages/TasksPage.tsx` | follow-up task CRUD |
| `src/pages/QuotesPage.tsx` | proposal/quote CRUD |

## Verification

- Run `node api/setup_crm_collections.mjs` in a MISO runtime shell.
- Open Dashboard and confirm seeded companies, contacts, deals, tasks, and quotes appear.
- Move a deal across pipeline stages and refresh; the stage should persist.
- Create a quote and task linked to a company/deal; Dashboard should update after refresh.
