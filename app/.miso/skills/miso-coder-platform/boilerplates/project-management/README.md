# project-management (boilerplate)

Linear-style project workspace for MISO Coder generated apps. This boilerplate is inspired by `ln-dev7/circle`, but it is rebuilt for Vite, React Router, TanStack Query, PocketBase runtime-client, and the managed shadcn/ui template.

Reference source:

- GitHub: https://github.com/ln-dev7/circle
- Reference commit: `e722b98b8fea7e95d1c40df86a1e0f2adec71f77`
- License: MIT, Copyright (c) 2025 lndev-ui | Circle Template

## Included Surface

- Workspace shell: compact sidebar, team switcher, inbox shortcut, workspace nav, team nav, account controls
- Issues: grouped list and board views, search, priority/status/team/project filters, create issue dialog, status transitions
- Projects: health, priority, lead, target date, progress, and active issue count
- Teams: joined state, member counts, project counts, team issue counts
- Members: MISO team seed with role, status, joined date, team membership
- Inbox: high-signal issue notifications and unassigned work
- Settings: workspace name, issue prefix, default team, public/private toggles
- PocketBase collection setup and hooks for issues, projects, teams, members, and inbox notifications

## Selective Copy Rules

Do not blindly copy this whole folder into an app with existing work. Copy only the slices the app needs.

Core shell and routing:

```text
src/App.tsx
src/components/project-management/app-shell.tsx
src/components/project-management/sidebar.tsx
src/components/project-management/topbar.tsx
src/components/project-management/workspace-switcher.tsx
src/lib/project-data.ts
src/lib/project-queries.ts
src/lib/project-store.ts
```

Issue workspace:

```text
api/setup_project_management_collections.mjs
api/project_management_hooks.pb.js
src/components/project-management/create-issue-dialog.tsx
src/components/project-management/filter-toolbar.tsx
src/components/project-management/issue-board.tsx
src/components/project-management/issue-list.tsx
src/components/project-management/status-badge.tsx
src/pages/IssuesPage.tsx
src/lib/project-data.ts
src/lib/project-queries.ts
src/lib/project-store.ts
```

Projects, teams, and members:

```text
src/components/project-management/project-table.tsx
src/components/project-management/team-table.tsx
src/components/project-management/member-table.tsx
src/pages/ProjectsPage.tsx
src/pages/TeamsPage.tsx
src/pages/MembersPage.tsx
```

Inbox and overview:

```text
src/components/project-management/inbox-panel.tsx
src/pages/OverviewPage.tsx
src/pages/InboxPage.tsx
```

## PocketBase Setup

Run this from the generated app after overlay:

```bash
node api/setup_project_management_collections.mjs
```

Required environment:

- `SM_INTERNAL_URL`
- `RUNTIME_APP_ID` or `RUNTIME_CODEBASE_ID`

Optional collection names:

- `PM_ISSUES_COLLECTION` (default: `pm_issues`)
- `PM_PROJECTS_COLLECTION` (default: `pm_projects`)
- `PM_TEAMS_COLLECTION` (default: `pm_teams`)
- `PM_MEMBERS_COLLECTION` (default: `pm_members`)
- `PM_INBOX_COLLECTION` (default: `pm_inbox`)

The browser does not create collections. It only reads and writes records through `@/lib/miso-sdk/runtime-client`.

## Data Model

| Collection | Purpose |
| --- | --- |
| `pm_issues` | Issue title, identifier, status, priority, assignee, team, project, label, due date, rank |
| `pm_projects` | Project status, health, priority, lead, percent complete, target date |
| `pm_teams` | Team key, icon, joined state, member keys, project keys |
| `pm_members` | MISO team member roster, role, status, team keys |
| `pm_inbox` | Issue notifications, mentions, assignment changes, due-date alerts |

## MISO Team Seed

- Ally: Operations
- Young: 기획자, MISO PO
- Eugene: FE 개발
- Kade: BE 개발
- Han: SRE
- Heather: UI/UX

## Design Notes

- Keep the Circle/Linear density: 40-48px rows, compact sidebar, muted borders, sticky group headers, and small status controls.
- Keep issue lists as rows and issue board columns as dense panels. Do not convert the main workspace into marketing cards.
- Use semantic shadcn tokens only. Do not add raw color hex values, `dark:` overrides, inline styles, or image-only UI.
- Keep source attribution in this README. Do not copy the original Next.js app routes, `next/*` imports, Square UI Pro links, Vercel badge, or remote avatar/image assets.

## Dependencies

Uses dependencies already present in the MISO Coder template:

- `@tanstack/react-query`
- `react-router-dom`
- `date-fns`
- `lucide-react`
- shadcn/ui Radix components

It intentionally does not add Circle's Next.js, zustand, motion, react-dnd, lexorank, react-icons, or Remix Icon dependencies.
