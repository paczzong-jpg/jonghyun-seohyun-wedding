# Boilerplates

Use these when the user asks for a complete app starting point rather than one feature. Each boilerplate is a Vite React overlay for the generated MISO website app template.

The boilerplates are vendored into this skill. Do not read or depend on a local source checkout from inside a generated app.

## Choose A Boilerplate

| User asks for | Read first |
| --- | --- |
| Data analysis studio, BI workbench, upload-and-explore datasets, encoding-shelf chart builder, auto insights, cross-filter dashboards | `bi-workbench/README.md` |
| Dashboard, admin dashboard, monitoring, analytics | `dashboard-app/README.md` |
| Admin console, shadcn-admin style, 업무관리, operations console | `admin/README.md` |
| Project management, issue tracker, Linear-style workspace, projects and teams | `project-management/README.md` |
| CRM, sales pipeline, contacts, accounts, quotes | `crm/README.md` |
| AI chatbot, assistant, direct LLM chat | `ai-chat/README.md` |
| Product, program, event landing page | `landing/README.md` |
| Survey, assessment, quiz with result dashboard | `survey/README.md` |
| Event, conference, registration, live Q&A | `event-app/README.md` |
| Arcade game, falling-blocks puzzle, brick breaker, local two-player game | `arcade-game/README.md` |
| Presentation, slide deck, 발표자료, 피치덱, PPT/PPTX 다운로드 | `presentation/README.md` |
| NotebookLM류 리서치 노트북, 소스 기반 Q&A·인용, 문서 요약/학습 도구, 오디오 오버뷰 | `notebook/README.md` |
| 회의록·미팅 노트테이커, 음성 녹음/전사(브라우저 STT), AI meeting minutes, 화자 분리 | `meeting/README.md` |
| Brand marketing studio, 마케팅 캠페인·SNS 콘텐츠 생성, 브랜드 DNA 추출, Pomelli 스타일 | `marketing-studio/README.md` |
| 뉴스 피드·뉴스 애그리게이터, 키워드 뉴스 수집(RSS), AI 뉴스 요약·질의응답, 데일리 브리핑, 뉴스레터/이메일 본문 | `newsroom/README.md` |
| Single-page converter, generator, utility tool | `utility-tool/README.md` |

## Overlay Rules

1. Read this index, then the selected boilerplate README.
2. Copy only files from the selected boilerplate folder into the generated app, preserving relative paths.
3. `src/App.tsx` replacement is intentional for a fresh app. For an app with user changes, inspect the existing file and merge routes/components instead of overwriting blindly.
4. Do not copy `.omc`, `.env`, lockfiles, `node_modules`, `src/components/ui`, `src/lib/miso-sdk`, or config files from any external source.
5. Install only the packages listed by the selected boilerplate README and only when package policy allows it.
6. Keep app-specific copy, labels, collection names, schema fields, and prompts in the indicated `src/lib/*` customization file.

## Common Follow-Up Recipes

| Need | Read next |
| --- | --- |
| PocketBase CRUD/schema | `recipes/pocketbase/crud/README.md` |
| PocketBase auth | `recipes/pocketbase/auth/README.md` |
| PocketBase realtime | `recipes/pocketbase/realtime/README.md` |
| PocketBase files | `recipes/pocketbase/files/README.md` |
| Spreadsheet import/export | `recipes/pocketbase/imports/spreadsheet/README.md` |
| MISO Direct LLM | `recipes/miso/llm/README.md` |
| MISO Chatflow/Agent/Workflow | `recipes/miso/{chatflow,agent,workflow}/README.md` |
| PocketBase realtime multiplayer | `recipes/pocketbase/realtime/README.md` |

## Verification

- Confirm the app imports managed template assets from `@/components/ui/*`, `@/lib/miso-sdk/*`, and `@/lib/utils`.
- Confirm no copied file references Next.js-only paths such as `app/layout.tsx` or `next.config.mjs`.
- Confirm no source file adds `React.StrictMode`.
- Run the focused app verification available in the sandbox after overlay and customization.
