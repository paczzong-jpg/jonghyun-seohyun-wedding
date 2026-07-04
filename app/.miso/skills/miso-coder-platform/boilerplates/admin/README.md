# admin (boilerplate)

MISO Coder 앱에서 운영자 콘솔을 만들 때 쓰는 shadcn-admin 계열 시작점. Vite + React Router + TanStack Query/Table + PocketBase runtime-client + shadcn 컴포넌트로 구성한다.

UX, sidebar, data table, command menu, settings layout은 `satnaing/shadcn-admin`의 구조를 참고했다. 원본을 그대로 vendoring하지 않고 MISO Coder 런타임에서 바로 overlay 가능한 부분만 포팅했다.

참고 원본:

- GitHub: https://github.com/satnaing/shadcn-admin
- Reference commit: `e16c87f213a5ba5e45964e9b67c792105ec74d26`
- License: MIT, Copyright (c) 2024 Sat Naing

## 포함 범위

- App shell: sidebar, team switcher, account menu, command palette, config drawer, skip link, navigation progress
- Dashboard: KPI cards, runtime activity chart, task status, recent tasks, activity feed
- Tasks: PocketBase `admin_tasks` CRUD, TanStack Query, TanStack Table, filters, sorting, pagination, selection, CSV import/export, bulk status/priority/delete
- Users: PocketBase `admin_users` CRUD, invite/create/edit/delete, filters, sorting, pagination, selection, bulk activate/deactivate/delete
- Apps: generated app catalog cards
- Chats: agent/chatflow/tool conversation queue mock
- Settings: profile, account, appearance, display, notifications with local save feedback
- Auth/error/help pages: sign-in, sign-in 2-column, sign-up, forgot password, OTP, 401/403/404/500/503, help center
- PocketBase `admin_tasks`, `admin_users` 컬렉션 생성/갱신 + seed 스크립트

## 선별 복사 규칙

이 boilerplate 폴더를 통째로 복사하지 말고, 만들려는 앱에 필요한 feature slice만 가져간다. 불필요한 화면, mock 데이터, route, 설정 페이지를 같이 복사하면 생성 앱이 무거워지고 유지보수 표면이 커진다.

기본 shell이 필요하면 다음을 함께 복사한다.

```text
src/App.tsx
src/context/admin-ui-provider.tsx
src/layout/*
src/components/command-menu.tsx
src/components/config-drawer.tsx
src/components/profile-dropdown.tsx
src/components/search.tsx
src/components/theme-switch.tsx
src/lib/admin-data.ts
src/lib/query-client.ts
```

Task CRUD/Table이 필요하면 다음을 함께 복사한다.

```text
api/setup_admin_collections.mjs
api/admin_hooks.pb.js
src/components/confirm-dialog.tsx
src/components/data-table/*
src/components/long-text.tsx
src/features/tasks/*
src/lib/admin-queries.ts
src/lib/admin-tasks.ts
src/lib/csv.ts
```

User CRUD/Table이 필요하면 다음을 함께 복사한다.

```text
api/setup_admin_collections.mjs
api/admin_hooks.pb.js
src/components/confirm-dialog.tsx
src/components/data-table/*
src/components/long-text.tsx
src/features/users/*
src/lib/admin-queries.ts
src/lib/admin-users.ts
```

Dashboard만 필요하면 다음을 함께 복사한다.

```text
src/features/dashboard/DashboardPage.tsx
src/lib/admin-data.ts
src/lib/admin-queries.ts
src/lib/admin-tasks.ts
```

Settings, auth, error, help pages는 앱 요구사항이 있을 때만 각각 `src/features/settings/*`, `src/features/auth/*`, `src/features/errors/*`, `src/features/help/*`를 복사하고 `src/App.tsx` route에 연결한다.

## 파일 구조

```text
api/
  setup_admin_collections.mjs       admin_tasks/admin_users 컬렉션 생성/갱신 + seed
  admin_hooks.pb.js                 admin_tasks/admin_users 생성 기본값 보장 hook

src/App.tsx                         라우터 + QueryClientProvider

src/context/
  admin-ui-provider.tsx             theme/sidebar 설정 state

src/layout/
  app-shell.tsx                     SidebarProvider + Outlet
  app-sidebar.tsx                   shadcn-admin식 sidebar
  header.tsx
  main.tsx
  nav-group.tsx
  nav-user.tsx
  team-switcher.tsx

src/components/
  command-menu.tsx
  config-drawer.tsx
  confirm-dialog.tsx
  data-table/                       TanStack Table helpers
    bulk-actions.tsx
  long-text.tsx
  navigation-progress.tsx
  password-input.tsx
  profile-dropdown.tsx
  search.tsx
  select-dropdown.tsx
  sign-out-dialog.tsx
  skip-to-main.tsx
  theme-switch.tsx

src/features/
  dashboard/DashboardPage.tsx
  tasks/
    TasksPage.tsx
    TasksTable.tsx
    TaskDialogs.tsx
    task-columns.tsx
    tasks-context.tsx
  users/UsersPage.tsx
    UserDialogs.tsx
    UsersTable.tsx
    user-columns.tsx
    users-context.tsx
  apps/AppsPage.tsx
  chats/ChatsPage.tsx
  help/HelpCenterPage.tsx
  settings/*
  auth/*
  errors/ErrorPage.tsx

src/lib/
  admin-data.ts                     navigation, team, app, chat, activity seed
  admin-queries.ts                  TanStack Query hooks
  admin-tasks.ts                    PocketBase CRUD + fallback data + CSV shape
  admin-users.ts                    PocketBase CRUD + fallback users
  csv.ts                            CSV import/export utility
  query-client.ts                   QueryClient defaults
```

## 라우트

| Route | 용도 |
|---|---|
| `/` | 운영 대시보드 |
| `/tasks` | 업무 관리 |
| `/records` | 기존 링크 호환용 업무 관리 alias |
| `/users` | 구성원 관리 |
| `/apps` | 앱 카탈로그 |
| `/chats` | 대화 큐 |
| `/help-center` | 도움말 센터 |
| `/settings/*` | 설정 |
| `/sign-in`, `/sign-in-2`, `/sign-up`, `/forgot-password`, `/otp` | auth 페이지 |
| `/401`, `/403`, `/404`, `/500`, `/503` | error 페이지 |

## PocketBase 컬렉션 설정

컬렉션은 브라우저 코드에서 만들지 않는다. 생성 앱에서 아래 명령을 실행한다.

```bash
node api/setup_admin_collections.mjs
```

필요한 환경변수:

- `SM_INTERNAL_URL`
- `RUNTIME_APP_ID` 또는 `RUNTIME_CODEBASE_ID`
- `ADMIN_TASKS_COLLECTION` (선택, 기본값: `admin_tasks`)

스크립트는 `admin_tasks`, `admin_users` 컬렉션을 생성하거나 full schema PATCH로 갱신하고, 비어 있으면 샘플 업무/사용자를 넣는다. `RECORDS_COLLECTION`도 임시 호환용 override로 읽지만 새 앱에서는 `ADMIN_TASKS_COLLECTION`, `ADMIN_USERS_COLLECTION`을 사용한다.

생성 필드:

### `admin_tasks`

| 필드 | 타입 | 설명 |
|---|---|---|
| `name` | text | 업무명 |
| `category` | text | 개발/디자인/기획/운영/고객지원 |
| `status` | text | 대기/진행중/완료/보류 |
| `priority` | text | 낮음/보통/높음/긴급 |
| `owner` | text | 담당자 |
| `amount` | number | 금액 |
| `dueDate` | text | 마감일 |
| `memo` | text | 메모 |
| `created` | autodate | 생성일 |
| `updated` | autodate | 수정일 |

### `admin_users`

| 필드 | 타입 | 설명 |
|---|---|---|
| `firstName` | text | 이름 |
| `lastName` | text | 성 |
| `username` | text | 사용자명 |
| `email` | email | 이메일 |
| `phoneNumber` | text | 전화번호 |
| `status` | text | active/inactive/invited/suspended |
| `role` | text | owner/admin/manager/operator/viewer |
| `department` | text | 부서 |
| `created` | autodate | 생성일 |
| `updated` | autodate | 수정일 |

API Rules는 public generated app 접근을 위해 빈 문자열로 둔다. 운영자 로그인이 필요하면 `recipes/pocketbase/auth` 또는 `recipes/miso/auth`를 조합하고 rules를 잠근다.

## Seed 구성원

- Ally
- Young: 기획자, MISO PO
- Eugene: FE 개발
- Kade: BE 개발
- Han: SRE
- Heather: UI/UX

## CSV 컬럼

가져오기 CSV 헤더:

| 컬럼명 | 타입 |
|---|---|
| 업무명 | 문자열 |
| 구분 | 문자열 |
| 상태 | 문자열 |
| 우선순위 | 문자열 |
| 담당자 | 문자열 |
| 마감일 | 문자열 |
| 금액(원) | 숫자 |
| 메모 | 문자열 |

내보내기는 같은 컬럼에 `등록일`을 추가한다.

## 안전 동작 기준

- 모든 메뉴 route는 실제 컴포넌트가 있어야 한다. 도움말 메뉴를 `/503` 같은 placeholder로 연결하지 않는다.
- destructive action은 단건 confirm 또는 대량 `DELETE` 입력 확인을 둔다.
- Users/Tasks 버튼은 UI만 보이는 상태로 두지 않는다. 최소한 toast 피드백이나 PB mutation을 연결한다.
- 비밀번호는 public `admin_users` 컬렉션에 저장하지 않는다. 로그인/가입 폼은 `recipes/miso/auth` 또는 `recipes/pocketbase/auth`와 결합한다.
- PB가 준비되지 않은 preview에서는 fallback seed를 보여주되, 생성/수정/삭제는 PB 컬렉션 setup 뒤에 동작한다.

## 의존성

템플릿 `package.json`에 다음 의존성이 있어야 한다.

- `@tanstack/react-query`
- `@tanstack/react-table`
- `react-router-dom`
- `recharts`
- `sonner`
- 기존 shadcn/ui Radix dependencies

가져오지 않는 원본 의존성:

- Clerk: MISO 로그인 또는 PocketBase auth recipe를 사용한다.
- TanStack Router: 이 템플릿은 기존 Vite/React Router 규칙을 유지한다.
- axios: `@/lib/miso-sdk/runtime-client` 또는 fetch wrapper를 사용한다.
- zustand: admin UI state는 작은 React context로 충분하다.
- input-otp: OTP 페이지는 기본 `Input`으로 유지한다.
- faker: seed 데이터는 고정 배열로 둔다. 생성 앱에서 불필요한 랜덤 dependency를 추가하지 않는다.

## 조합 recipe

| recipe | 용도 |
|---|---|
| `pocketbase/crud` | `admin_tasks` CRUD |
| `pocketbase/auth` | 운영자 로그인/권한 |
| `pocketbase/realtime` | 실시간 목록 갱신 |
| `pocketbase/imports/spreadsheet` | XLSX import/export 확장 |
| `miso/auth` | MISO 로그인 연동 |

## 규칙

- 필요한 feature slice만 복사한다.
- shadcn은 `@/components/ui/*`에서 직접 import한다.
- `pb`는 `@/lib/miso-sdk/runtime-client`를 사용한다.
- PocketBase query/mutation은 `src/lib/admin-queries.ts`를 통해 TanStack Query로 감싼다.
- 컬렉션 schema 변경은 `api/setup_admin_collections.mjs` 또는 내부 runtime API로 한다.
- 브라우저 코드에서 컬렉션을 생성/수정하지 않는다.
- StrictMode wrapper를 추가하지 않는다.
- Users/Tasks처럼 실제 관리 메뉴는 row action, bulk action, empty/loading/error state를 같이 옮긴다.
