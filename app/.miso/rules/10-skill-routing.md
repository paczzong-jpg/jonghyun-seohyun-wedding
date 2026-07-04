# Skill routing

Use `.miso/skills/*/SKILL.md` for long platform recipes. Rules stay short and
only decide which skill to load.

## MISO platform integrations

- 새 생성 웹앱 기능을 계획, 디자인, 구현하기 전에는 이 라우팅 파일을 확인한다. 기능이 `miso-coder-platform` 범위에 걸리면 답변, 기획안, 디자인 방향, 코드 변경 전에 `.miso/skills/miso-coder-platform/SKILL.md`를 먼저 읽는다.
- Vite 프론트엔드, PocketBase 데이터/훅, MISO SDK, 외부 시스템/플랫폼 연동, 외부 API, Supabase, 파일/바이너리 다운로드, sandbox command 제약, runtime diagnostics가 걸린 생성 웹앱 기능은 `miso-coder-platform`을 사용한다.
- 외부 서비스와 로그인/권한, 토큰/secret, webhook/callback, 데이터 송수신, SDK/embed, 서버 프록시, 외부 제품 액션 실행을 붙이는 기능이면, 서비스명이 문서에 없어도 `miso-coder-platform`을 먼저 확인한다.
- Supabase connection or Supabase API usage in a generated website app: use `miso-coder-platform`.
- PocketBase runtime work, collection schemas, browser CRUD persistence, `api/*.pb.js` hooks, `proxyFetch`, hook reloads, or PocketBase record API usage: use `miso-coder-platform`.
- MISO app integration, Direct LLM calls, Direct LLM Client Tools, Workspace Tool calls, knowledge search, external APIs, and PocketBase runtime work are internal references/recipes inside `miso-coder-platform`, not separate top-level skills.
- Direct LLM Client Tools are browser/app functions defined through `src/lib/miso-sdk/miso-llm.ts`; Workspace Tools are platform-registered tools invoked through `useMisoTool` and `.miso/specs/api-integration/tool-*.md`. Do not route one as the other.
- MISO personal connector OAuth is currently unavailable in the API rollout. Do not plan or implement `src/lib/miso-sdk/miso-connectors.ts`, `/__api/auth/connectors/*`, connector grants, connector tokens, or `connectorAuth` in generated app work. If the user needs user-delegated provider access, report that MISO connector OAuth is not available yet; use standalone provider OAuth/API recipes only when the user explicitly asks for that non-MISO-connector path.
- Website cloning, copying, rebuilding, replication, reverse-engineering, or pixel-perfect recreation from a target URL: use `clone-website`.
- 프리젠테이션·슬라이드 덱·발표자료·피치덱 웹앱, 또는 PPT/PPTX 다운로드가 필요한 요청: `miso-coder-platform`의 `boilerplates/presentation/README.md`를 먼저 읽는다.
- NotebookLM류 리서치 노트북, 문서(PDF/URL) 업로드 후 근거 인용 Q&A·요약·학습(퀴즈·플래시카드)·오디오 브리핑 요청: `miso-coder-platform`의 `boilerplates/notebook/README.md`를 먼저 읽는다.
- 회의록·미팅 노트테이커, 음성 녹음/전사(STT)·화자 분리·AI 회의록·회의 오디오 업로드 요청: `miso-coder-platform`의 `boilerplates/meeting/README.md`를 먼저 읽는다.
- 브랜드 마케팅 캠페인·SNS/광고 크리에이티브 생성·브랜드 DNA 추출(Pomelli 류) 웹앱 요청: `miso-coder-platform`의 `boilerplates/marketing-studio/README.md`를 먼저 읽는다.

Always read the matching `.miso/specs/api-integration/*.md` file before using a
skill for a specific app, model, tool, or knowledge dataset. If a skill example
conflicts with `src/lib/miso-sdk/`, the SDK source wins.
