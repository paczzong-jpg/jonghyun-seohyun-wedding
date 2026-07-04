# notebook (boilerplate)

NotebookLM급 **소스 기반 리서치 노트북** 앱의 template-grade 시작점.
**Vite + React + PocketBase + Direct LLM(miso-sdk)** 오버레이다.

> 이 폴더는 **베이스 코더 템플릿을 전제**한다. `src/components/ui/`(shadcn), `src/lib/miso-sdk/`, 설정파일은 템플릿에 이미 있으므로 여기 중복 포함하지 않는다.

---

## 무엇이 되는가 (전부 실동작)

| 영역 | 기능 |
|------|------|
| 노트북 | 대시보드 그리드·생성(색 커버)·이름변경·보관·삭제(cascade)·전역 검색(⌘K) |
| 소스 | **PDF·DOCX·MD·TXT 업로드(드래그앤드롭·멀티)** / **URL 본문 추출** / 붙여넣기 텍스트. 자동 브리프(요약·토픽·추천질문), 단계별 진행 표시, 실패 상태 |
| 컨텍스트 제어 | 소스별 **전문/요약만/제외** 3모드 — 목록 배지 클릭 순환 + 뷰어 세그먼트 |
| 채팅 | 다중 세션(제목 자동 생성)·스트리밍·중단·재생성 / **[n] 인용 칩 → hover 근거 팝오버 → 클릭 시 소스 뷰어** / 추천 질문 / 답변 복사·노트 저장 |
| 소스 뷰어 | 요약·토픽·이 소스에 물어보기(질문 주입)·**원문 전문 + 검색 하이라이트(이전/다음)** |
| Studio | **오디오 오버뷰**(2화자 대본→Web Speech 재생·라인 점프·배속·**재생 중 끼어들기 질문**) / **마인드맵**(collapsible SVG 트리, 노드 클릭→질문) / **플래시카드**(뒤집기·섞기) / **퀴즈**(풀기·채점·인용 해설) / **데이터 테이블**(정렬·CSV 다운로드) / **리포트**(요약·인사이트·학습가이드·FAQ·브리핑·액션아이템 + 커스텀 지시) — 전부 PocketBase 저장·재열람 |
| 노트 | 마크다운 편집+미리보기, AI 산출물 저장, **노트→소스 변환** |
| 품질 | 다크모드(시스템 감지+토글), 반응형(3컬럼→모바일 탭), 모든 빈/로딩/에러 상태, sonner 토스트, 패널 접기 |

**계약상 제외** (플랫폼에 해당 기능 없음): 오디오 파일 생성·비디오 오버뷰(TTS/영상 API 없음 — 재생은 브라우저 Web Speech), 오디오/비디오 소스 전사(STT 없음), 벡터 검색(임베딩 없음 — 전문 검색 제공).

## 파일 구성

```
src/App.tsx                                   라우팅( / , /notebook/:id ) + Toaster — 템플릿 App 대체
src/pages/DashboardPage.tsx                   노트북 그리드·전역검색(⌘K)·생성/보관/삭제
src/pages/NotebookPage.tsx                    3컬럼 셸(Sources/Chat/Studio)·컨텍스트 캐시·질문 주입 배선
src/lib/notebook-config.ts                    ★ 교체 지점 — 앱 이름·태그라인·커버색·리포트 프리셋
src/lib/notebook/
  types.ts                                    도메인 타입(PB 필드와 1:1) + Studio 아티팩트 페이로드
  db.ts                                       PB CRUD 레이어 (nb_* 컬렉션, $autoCancel:false)
  ingest.ts                                   소스 파이프라인: 추출(pdf.js·mammoth·Readability)→청크→브리프
  llm.ts                                      Direct LLM 오케스트레이션 — 컨텍스트 빌더·인용·Studio 생성기
  audio.ts                                    Web Speech 2화자 팟캐스트 플레이어
  use-theme.ts                                다크모드 토글(.dark 클래스 + localStorage)
src/components/notebook/
  shared/markdown.tsx                         마크다운 렌더 + [n]→인용 칩 변환
  shared/source-icon.tsx                      소스 타입 아이콘·라벨
  sources/{sources-panel,add-source-dialog,source-viewer}.tsx
  chat/chat-panel.tsx                         세션·스트리밍·인용 hover카드·재생성·노트저장
  studio/{studio-panel,artifact-viewer,audio-overview,mindmap-view,report-dialog,note-dialog}.tsx
src/styles/notebook.css                       디자인 시스템 — shadcn 시맨틱 토큰 오버라이드(라이트/다크)
```

## 의존성

```bash
pnpm add pdfjs-dist@4.10.38 mammoth@1.8.0 @mozilla/readability@0.5.0 react-markdown@9.0.1 remark-gfm@4.0.0
```

pdf.js·mammoth는 해당 형식 인제스트 시점에만 dynamic import(초기 번들 무관). recharts·lucide 등은 베이스 템플릿에 이미 있다.

## PocketBase 컬렉션 생성 (필수 — 오버레이 직후 실행)

고정 collection id를 사용하므로 아래 curl을 **순서대로 그대로** 실행하면 된다 (id 파싱 불필요).
규칙: API rules는 반드시 `""`, 모든 컬렉션에 `created`/`updated` autodate 포함(정렬 400 방지).

```bash
# 1. 노트북
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nbcolnotebooks1","name":"nb_notebooks","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"name","type":"text","required":true},
    {"name":"description","type":"text"},
    {"name":"color","type":"text"},
    {"name":"archived","type":"bool"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 2. 소스
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nbcolsources001","name":"nb_sources","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"notebook","type":"relation","required":true,"collectionId":"nbcolnotebooks1","cascadeDelete":true,"maxSelect":1},
    {"name":"title","type":"text","required":true},
    {"name":"type","type":"text","required":true},
    {"name":"url","type":"text"},
    {"name":"status","type":"text"},
    {"name":"summary","type":"text","max":20000},
    {"name":"topics","type":"json"},
    {"name":"questions","type":"json"},
    {"name":"excerpt","type":"text","max":2000},
    {"name":"char_count","type":"number"},
    {"name":"context_mode","type":"text"},
    {"name":"error","type":"text"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 3. 소스 청크 (원문은 4천자 청크로 분산 저장 — text 필드 대용량 저장 금지 규칙 준수)
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nbcolchunks0001","name":"nb_source_chunks","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"source","type":"relation","required":true,"collectionId":"nbcolsources001","cascadeDelete":true,"maxSelect":1},
    {"name":"notebook","type":"relation","required":true,"collectionId":"nbcolnotebooks1","cascadeDelete":true,"maxSelect":1},
    {"name":"idx","type":"number"},
    {"name":"text","type":"text","max":100000},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 4. 채팅 세션
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nbcolsessions01","name":"nb_chat_sessions","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"notebook","type":"relation","required":true,"collectionId":"nbcolnotebooks1","cascadeDelete":true,"maxSelect":1},
    {"name":"title","type":"text"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 5. 메시지
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nbcolmessages01","name":"nb_messages","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"session","type":"relation","required":true,"collectionId":"nbcolsessions01","cascadeDelete":true,"maxSelect":1},
    {"name":"notebook","type":"relation","required":true,"collectionId":"nbcolnotebooks1","cascadeDelete":true,"maxSelect":1},
    {"name":"role","type":"text","required":true},
    {"name":"content","type":"text","max":100000},
    {"name":"citations","type":"json"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 6. Studio 아티팩트 (오디오 대본·마인드맵·플래시카드·퀴즈·테이블·리포트 payload)
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nbcolartifacts1","name":"nb_artifacts","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"notebook","type":"relation","required":true,"collectionId":"nbcolnotebooks1","cascadeDelete":true,"maxSelect":1},
    {"name":"type","type":"text","required":true},
    {"name":"title","type":"text"},
    {"name":"payload","type":"json","maxSize":2000000},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 7. 노트
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nbcolnotes00001","name":"nb_notes","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"notebook","type":"relation","required":true,"collectionId":"nbcolnotebooks1","cascadeDelete":true,"maxSelect":1},
    {"name":"title","type":"text"},
    {"name":"content","type":"text","max":100000},
    {"name":"kind","type":"text"},
    {"name":"origin","type":"text"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'
```

> 컬렉션 **수정** 시 `PATCH /collections/<id>` 는 `fields` 를 통째로 교체한다 — 반드시 기존 필드 전체 + 신규 필드를 함께 보낼 것.

## ★ 필수 교체 — `src/lib/notebook-config.ts`

| 항목 | 현재값 | 교체 |
|------|--------|------|
| `APP_NAME` | `"Lumen"` | 서비스 이름 |
| `APP_TAGLINE` | 소개 문구 | 실제 소개 |
| `NOTEBOOK_COLORS` | 6색 팔레트 | 브랜드에 맞게 (선택) |
| `TRANSFORM_PRESETS` | 리포트 프리셋 6종 | 도메인 프리셋 추가/수정 (선택) |

## 아키텍처 노트 (수정 시 반드시 이해할 것)

- **Direct LLM 계약**: 모든 생성은 `src/lib/miso-sdk/miso-llm.ts` 를 통해서만. 모델은 `getMisoLLMConfig().selected_models[0]` 자동 사용(`llm.ts resolveTargetModel`, 캐시). 채팅은 SSE 스트리밍(`streamMisoLLM`), Studio 생성기는 JSON 강제+`parseJsonLoose` 관용 파싱.
- **인용 규약**: 컨텍스트는 활성 소스를 `[n] 제목\n본문` 으로 엮고(`buildNotebookContext`, 총 36k자 예산·소스당 4~16k), 시스템 프롬프트가 `[n]` 인용을 강제한다. 응답의 `[n]` 은 `markdown.tsx` 가 칩으로 렌더하고 `extractCitations` 가 소스에 매핑한다. **컨텍스트 형식을 바꾸면 인용 파서·소스 뷰어 연결까지 함께 바꿔야 한다.**
- **URL 인제스트**: 브라우저 `fetch(외부URL)` 는 플랫폼 인터셉터가 자동으로 `__external` 프록시로 보낸다 — 직접 CORS 처리·프록시 경로 하드코딩 금지. 파싱은 DOMParser+Readability.
- **원문 저장**: 소스 본문은 `nb_source_chunks` 4천자 청크로 저장(단일 text 필드 대용량 저장 금지). 전문은 `getSourceText` 로 idx 정렬 조합.
- **오디오 오버뷰**: LLM이 A/B 대본(JSON)을 만들고 `audio.ts` 가 Web Speech로 재생(한국어 보이스 자동 선택, 없으면 피치·속도로 화자 구분). **오디오 파일 다운로드가 아니라 브라우저 재생**이다 — TTS 파일 API는 플랫폼에 없다. 끼어들기 질문은 현재 라인 뒤에 응답 대본을 삽입 후 이어 재생.
- **PDF 추출**: CJK 폰트는 글리프 단위로 쪼개져 오므로 `extractPdf` 는 공백을 라틴 경계에서만 삽입한다 — `join(" ")` 로 되돌리면 한글이 전부 띄어진다.
- **PB 동시 요청**: 같은 컬렉션 병렬 조회는 반드시 `$autoCancel:false` (기존 코드 패턴 유지).

## 사용법

1. **파일 배치**: 위 파일들을 동일 경로에 복사(`src/App.tsx` 는 교체). 의존성 설치.
2. **컬렉션 생성**: 위 curl 7개 실행 → `.miso/bin/pb-typegen` (선택).
3. **브랜딩**: `notebook-config.ts` 교체.
4. **검증**: 노트북 생성 → 텍스트 소스 추가 → 채팅 질문에 [n] 인용이 달리는지 → Studio 타일 1개 생성까지 확인.

## 규칙 (템플릿 규칙 준수)

- shadcn 은 `@/components/ui/*` 직접 import, `cn()` 은 `@/lib/utils`. `ui/`·`miso-sdk/` 수정 금지.
- 색·라운딩은 `notebook.css` 의 시맨틱 토큰 값(라이트/다크 쌍)으로만 조정 — 컴포넌트에 hex 하드코딩 금지.
- `React.StrictMode` 추가 금지 (PocketBase auto-cancel 충돌).
- 데이터와 뷰 분리: 브랜딩·프리셋은 `notebook-config.ts` 에만.

---

_검증: 실제 코더 템플릿에 오버레이 후 `npm run build`(tsc -b + vite build) 통과. 로컬 PB+LLM 환경에서 E2E 28단계(생성→PDF/URL/텍스트 인제스트→인용 채팅→hover 팝오버→뷰어 검색→Studio 6종→다크모드) 스크린샷 검증 완료._
