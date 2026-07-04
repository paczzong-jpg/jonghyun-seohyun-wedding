# newsroom (boilerplate)

**키워드 기반 뉴스 수집 + AI 질의응답 + 데일리 브리핑·이메일 본문** 을 갖춘 프리미엄 **개인화 뉴스 포털**("조간/CHOGAN")의 template-grade 시작점.
**Vite + React + PocketBase + Direct LLM(miso-sdk)** 오버레이다. 외부 수집은 전부 브라우저 `fetch()` → 플랫폼 `__external` 프록시 경유(PB 훅 없음).

> 이 폴더는 **베이스 코더 템플릿을 전제**한다. `src/components/ui/`(shadcn), `src/lib/miso-sdk/`, `src/lib/utils.ts`, 설정파일은 템플릿에 이미 있으므로 여기 중복 포함하지 않는다.

---

## 무엇이 되는가 (전부 실동작)

| 영역 | 기능 |
|------|------|
| 홈(포털) | 신문 마스트헤드 + **오늘의 이슈(토픽 클러스터)** + 최신 기사 지면. 수집 라이브 인디케이터, 빈 상태 온보딩 |
| 뉴스 수집 | **프리셋 RSS 매체 33종**(실측 검증) + **구독 키워드별 Google News RSS 검색**. 모든 외부 요청은 브라우저 `fetch()` → `__external` 서버 프록시 자동 라우팅. 인코딩(EUC-KR)·Atom·날짜 변형을 파서가 흡수 |
| 요약·키포인트 | **Direct LLM 배치 요약** — 한 줄·3줄·키포인트·엔티티·핵심 인용. 기사 화면에서 요약 스타일 4종 토글(3줄/쉽게/팩트 5W/한 줄) |
| 토픽 클러스터링 | 같은 사건 기사를 시간창·제목 유사도로 묶어 **이슈 카드** 생성 + 클러스터 브리핑 |
| 본문 리더 모드 | `@mozilla/readability` 본문 추출 + `DOMPurify` 새니타이즈 → 광고·크롬 없는 읽기 화면 |
| AI 질의응답 | **수집된 코퍼스 근거 스트리밍 Q&A** — 답변의 **[n] 인용 칩 → 기사 이동**, 세션 목록·기록 저장, 중단, 스타터 질문 |
| 데일리 브리핑 | 오늘의 뉴스를 하나의 서사로 **스트리밍 요약**([n] 인용) — 당일 캐시 재사용·재생성, **오디오 낭독**(브라우저 Web Speech), 이메일 진입점 |
| 이메일 만들기 | 브리핑을 **이메일 본문(HTML)으로 생성** + "서식 복사"(클립보드). 요구사항대로 **전송은 하지 않음** |
| 관리 | 매체 활성 토글·프리셋 불러오기·지금 수집, 구독 키워드 CRUD(관련어·제외어), 브리핑 톤·독자 설정 |
| 품질 | 다크모드(시스템 감지+토글), 모든 빈/로딩/에러/수집중 상태, 실패 시 "다시 시도", sonner 토스트, 커버리지 바 |

**계약상 한계** (README 를 읽는 AI 는 사용자에게 이대로 안내할 것):
- **이메일은 본문 생성까지만** — 실제 발송 도구가 연결돼 있지 않을 가능성이 높아, EmailDialog 는 HTML 본문 생성 + 서식 복사만 제공한다(요구사항). 발송을 붙이려면 별도 도구/엔드포인트를 연결해야 한다.
- **수집·요약은 열린 브라우저 탭에서** 실행된다 — 서버 배치 수집은 플랫폼에 없다. 탭을 닫으면 진행 중인 수집이 중단된다(수동 "지금 수집"으로 재개).
- **외부 매체 차단**: 일부 매체는 CORS/차단/구조 문제로 리더 모드 본문 추출이 실패할 수 있다 — 이때 RSS 요약본으로 자동 폴백한다(앱 결함 아님).
- **오디오 브리핑은 낭독만** — 브라우저 내장 `speechSynthesis` 재생이며 오디오 파일 생성·다운로드는 없다(플랫폼에 TTS 파일 API 없음). 미지원 브라우저는 토스트로 안내.
- AI 산출물(요약·클러스터·브리핑·답변)은 LLM 생성이라 **사실 검증이 필요**하다 — 모든 화면이 원문 링크를 함께 제공한다.

## 파일 구성

```
src/App.tsx                              RootLayout(코퍼스·구독·설정 1회 적재→Outlet) + 라우팅 — 템플릿 App 대체
src/pages/home.tsx                       포털 홈 — 오늘의 이슈(클러스터)·최신 기사·빈 상태 온보딩
src/pages/story.tsx                      이슈 상세 — 클러스터 브리핑 + 소속 기사 + "이 이슈로 대화하기"
src/pages/article.tsx                    기사 상세 — 리더 모드 + AI 요약(4스타일)·키포인트·엔티티·인용
src/pages/briefing.tsx                   데일리 브리핑 페이지(설정 준비 게이트)
src/pages/chat.tsx                       AI 질의응답 — 세션 목록 + 스트리밍 답변(스트리밍 보존 리마운트 방지)
src/pages/manage.tsx                     관리 — 매체(RSS)·구독 키워드·브리핑 설정
src/pages/context.ts                     Outlet 컨텍스트 타입 + useNews 훅
src/lib/news-config.ts                   ★ 교체 지점 — 브랜딩·프리셋 소스·수집 파라미터·톤
src/lib/news/
  types.ts                               도메인 타입(PB 필드와 1:1)
  db.ts                                  PB CRUD(nw_*)·batch·읽음 상태(localStorage)
  bootstrap.ts                           시딩(프리셋)·자동 수집 게이트(신선도)
  collect.ts                             수집 오케스트레이션(fetch→정규화→dedup→요약→클러스터)
  ingest.ts                              RSS/Atom 파서(인코딩·날짜 변형 흡수)
  search.ts                              Google News RSS 키워드 검색
  reader.ts                              본문 리더 모드(Readability + DOMPurify)
  normalize.ts                           정규화·KST 날짜·제목 유사도 dedup
  llm.ts                                 Direct LLM — 요약·키포인트·클러스터 라벨·브리핑·채팅·이메일·오디오 대본
  email.ts                               이메일 HTML 본문 빌더
  audio.ts                               오디오 브리핑(Web Speech 낭독)
  use-theme.ts                           다크모드
src/components/news/
  masthead.tsx                           신문 마스트헤드·내비·수집 라이브 인디케이터
  cluster-card.tsx                       오늘의 이슈 카드
  article-row.tsx                        기사 행(리스트)
  story-brief.tsx                        이슈 브리핑 블록
  reader-view.tsx                        리더 모드 렌더
  briefing-view.tsx                      데일리 브리핑(스트리밍·오디오·이메일 진입)
  chat-panel.tsx                         AI 채팅(스트리밍·[n] 인용)
  email-dialog.tsx                       이메일 본문 생성·서식 복사
  keyword-dialog.tsx                     구독 키워드 추가(관련어·제외어)
  collect-console.tsx                    수집 진행 콘솔·useCollectProgress
  coverage-bar.tsx                       매체 커버리지 바
  markdown.tsx                           마크다운 렌더 + [n] 인용 칩
  shared.tsx                             공용 UI 조각(mediaLabel 등)
src/styles/news.css                      디자인 시스템 — 시맨틱 토큰(라이트/다크)·카테고리 틴트
```

## 의존성

```bash
pnpm add @mozilla/readability@0.5.0 dompurify@3.2.4 react-markdown@9.0.1 remark-gfm@4.0.0
```

- `@mozilla/readability`·`dompurify` 는 **리더 모드 시점에만** 쓰인다(`reader.ts`). `react-markdown`·`remark-gfm` 은 브리핑·채팅·기사 요약의 마크다운 렌더에 공통.
- 외부 매체 응답은 npm 이 아니라 **사용자 브라우저 `fetch()`가 플랫폼 `__external` 프록시를 통해** 받는다 — CORS·인코딩·서버 IP 제약을 프록시가 흡수한다.

## PocketBase 컬렉션 생성 (필수 — 오버레이 직후 실행)

고정 collection id 를 사용하므로 아래 curl 을 **순서대로 그대로** 실행하면 된다 (id 파싱 불필요, 관계가 있어 순서 중요).
규칙: API rules 는 반드시 `""`, 모든 컬렉션에 `created`/`updated` autodate 포함(정렬 400 방지).

```bash
# 1. 구독 키워드(토픽)
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nwcoltopics0001","name":"nw_topics","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"name","type":"text","required":true},
    {"name":"queries","type":"json"},
    {"name":"related","type":"json"},
    {"name":"exclude","type":"json"},
    {"name":"color","type":"text"},
    {"name":"active","type":"bool"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 2. 매체(RSS 소스)
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nwcolsources001","name":"nw_sources","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"name","type":"text","required":true},
    {"name":"url","type":"text","required":true},
    {"name":"site_url","type":"text"},
    {"name":"category","type":"text"},
    {"name":"media_type","type":"text"},
    {"name":"active","type":"bool"},
    {"name":"last_fetched","type":"date"},
    {"name":"last_status","type":"text"},
    {"name":"last_error","type":"text"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 3. 기사 (source 관계 + key UNIQUE 인덱스로 중복 수집 방지)
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nwcolarticles01","name":"nw_articles","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "indexes":["CREATE UNIQUE INDEX `idx_nw_articles_key` ON `nw_articles` (`key`)"],
  "fields":[
    {"name":"key","type":"text","required":true},
    {"name":"url","type":"text","required":true},
    {"name":"origin","type":"text"},
    {"name":"title","type":"text","required":true},
    {"name":"source","type":"relation","collectionId":"nwcolsources001","cascadeDelete":false,"maxSelect":1},
    {"name":"source_name","type":"text"},
    {"name":"media_type","type":"text"},
    {"name":"topic_ids","type":"json"},
    {"name":"author","type":"text"},
    {"name":"published","type":"date"},
    {"name":"desc_src","type":"text","max":5000},
    {"name":"content_src","type":"text","max":100000},
    {"name":"image_url","type":"text"},
    {"name":"one_liner","type":"text"},
    {"name":"summary","type":"text","max":3000},
    {"name":"key_points","type":"json"},
    {"name":"entities","type":"json"},
    {"name":"quote","type":"text","max":2000},
    {"name":"ai_status","type":"text"},
    {"name":"reader_status","type":"text"},
    {"name":"reader_html","type":"text","max":100000},
    {"name":"reader_text","type":"text","max":100000},
    {"name":"summary_variants","type":"json"},
    {"name":"cluster","type":"text"},
    {"name":"bookmarked","type":"bool"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 4. 토픽 클러스터(이슈)
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nwcolclusters01","name":"nw_clusters","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"ckey","type":"text","required":true},
    {"name":"label","type":"text","required":true},
    {"name":"day","type":"text"},
    {"name":"category","type":"text"},
    {"name":"rep","type":"text"},
    {"name":"article_ids","type":"json"},
    {"name":"size","type":"number"},
    {"name":"brief","type":"json","maxSize":2000000},
    {"name":"brief_status","type":"text"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 5. 채팅 세션
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nwcolsessions01","name":"nw_chat_sessions","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"title","type":"text"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 6. 채팅 메시지 (session 관계)
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nwcolmessages01","name":"nw_messages","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"session","type":"relation","required":true,"collectionId":"nwcolsessions01","cascadeDelete":true,"maxSelect":1},
    {"name":"role","type":"text","required":true},
    {"name":"content","type":"text","max":100000},
    {"name":"citations","type":"json"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 7. 브리핑(데일리·이메일·오디오 캐시)
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nwcolbriefing01","name":"nw_briefings","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"day","type":"text","required":true},
    {"name":"kind","type":"text","required":true},
    {"name":"title","type":"text"},
    {"name":"content_md","type":"text","max":100000},
    {"name":"citations","type":"json"},
    {"name":"email","type":"json","maxSize":500000},
    {"name":"audio","type":"json","maxSize":500000},
    {"name":"params","type":"json"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 8. 설정(톤·독자·뮤트)
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"nwcolsettings001","name":"nw_settings","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"tone","type":"text"},
    {"name":"audience","type":"text"},
    {"name":"mute","type":"json"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'
```

> 컬렉션 **수정** 시 `PATCH /collections/<id>` 는 `fields` 를 통째로 교체한다 — 반드시 기존 필드 전체 + 신규 필드를 함께 보낼 것.
> `nw_articles.key` UNIQUE 인덱스는 중복 수집 방지의 핵심이다 — upsert 가 key 로 기존 기사를 판별한다. 제거하지 말 것.
> `nw_articles.source` 는 `cascadeDelete:false` 다 — 매체를 지워도 과거 기사는 보존된다(관계만 비워짐).

## ★ 필수 교체 — `src/lib/news-config.ts`

| 항목 | 현재값 | 교체 |
|------|--------|------|
| `APP_NAME` / `APP_NAME_EN` / `APP_TAGLINE` | `"조간"` / `"CHOGAN"` / `"AI가 정리하는 나의 아침 신문"` | 서비스 이름·영문·소개 |
| `PRESET_SOURCES` | 실측 검증 RSS 33종(국내·글로벌) | 매체 추가·삭제(`url`·`category`·`default_active`). 새 매체는 실제 피드 확인 후 추가 |
| `TOPIC_SUGGESTIONS` | 온보딩 키워드 예시 6종 | 서비스 성격에 맞게 (선택) |
| `COLLECT` | 수집 파라미터(신선도·소스/질의 상한·동시성·클러스터 시간창) | 필요 시 조정 (선택) |
| `TONES` / `DEFAULT_AUDIENCE` | 뉴스레터체/기사체·기본 독자 | 브랜드 보이스에 맞게 (선택) |

## 아키텍처 노트 (수정 시 반드시 이해할 것)

- **외부 fetch 경로 (핵심)**: 모든 외부 요청(RSS·본문·Google News)은 브라우저 plain `fetch()` 이며 플랫폼 `__external` 서버 프록시로 **자동 라우팅**된다. **PB Goja 훅을 쓰지 않는다** — 수집 로직을 훅으로 옮기지 말 것. CORS·인코딩(EUC-KR)·타임아웃을 클라이언트 파서(`ingest.ts`)와 프록시가 함께 흡수하도록 설계됐다. 발행 모드에서는 런타임 베이스가 `/site/<code>/` 를 접두한다(자동 판별).
- **수집 파이프라인**: `collect.ts` 가 fetch → `ingest`(파싱) → `normalize`(dedup) → `llm`(요약 배치) → 클러스터 순으로 오케스트레이션한다. 열린 탭에서 실행되며 `useCollectProgress` 로 진행률을 방송한다. `COLLECT.maxItemsPerSource`(대량 피드 방어)·`maxSummariesPerRun`(토큰 방어)·`summaryBatchSize` 는 실측 값 — 무작정 늘리지 말 것.
- **키워드 검색**: 구독 키워드는 `googleNewsSearchUrl` 로 Google News RSS 를 질의당 수집한다. `when:` 파라미터로 기간을 제한하고 질의당 `maxItemsPerQuery` 로 상한을 건다.
- **본문 리더 모드**: `reader.ts` 가 `@mozilla/readability` 로 본문을 추출하고 `DOMPurify` 로 새니타이즈한다(`configureSanitizer` 를 부팅 시 1회 호출). 추출 실패 매체는 RSS `desc_src`/`content_src` 요약본으로 폴백한다.
- **[n] 인용 규약**: LLM 컨텍스트는 번호 기사 인용(`[n]`)을 강제한다. `markdown.tsx` 가 `[n]` 을 인용 칩으로 렌더하고 `onCite(ref)` 로 `/article/:id` 이동시킨다. 브리핑·채팅·이메일이 이 규약을 공유 — **컨텍스트 라인 형식을 바꾸면 인용 추출·칩 렌더까지 함께 바꿔야 한다.**
- **읽음 상태**: 기사 읽음 여부는 PB 에 저장하지 않고 `localStorage`(`nw:read`, `READ_LIMIT` 3000)로 관리한다. 사용자별 로그인이 없는 보일러플레이트라 로컬로 충분하다.
- **자동 수집 게이트**: 부팅 시 신선도(`COLLECT.staleAfterMs`) 만료일 때만 자동 수집한다(`maybeAutoCollect`, force 아님). 강제 수집은 관리 화면의 "지금 수집".
- **PB batch / autoCancel**: 플랫폼 PB batch API 는 enabled(maxRequests 50)다 — `db.ts` 의 청크 크기가 이 한도에 맞춰져 있다. 같은 컬렉션 병렬 조회는 반드시 `$autoCancel:false`(`NO_CANCEL` 상수) — 기존 패턴을 유지할 것.
- **오디오/이메일 한계**: 오디오는 `speechSynthesis` 낭독만(파일/다운로드 없음, 대본은 LLM 이 `[n]` 없이 재작성). 이메일은 HTML 본문 생성 + 서식 복사까지(전송 도구 미연결) — 요구사항이다.
- **`React.StrictMode` 추가 금지** (PocketBase auto-cancel 충돌). 채팅은 세션 생성 후에도 리마운트하지 않아 스트리밍을 보존한다(`chat.tsx`).

## 사용법

1. **파일 배치**: 위 파일들을 동일 경로에 복사(`src/App.tsx` 는 교체). 의존성 설치.
2. **컬렉션 생성**: 위 curl 8개를 **순서대로** 실행 → `.miso/bin/pb-typegen` (선택).
3. **브랜딩**: `news-config.ts` 의 앱명·프리셋 매체 교체.
4. **검증**: 관리 → "프리셋 불러오기" → "지금 수집"(진행 콘솔) → 홈 "오늘의 이슈" → 기사 리더 모드 + AI 요약 → 브리핑 스트리밍 + 듣기 + "메일로 만들기" → 채팅 스타터 질문 + [n] 인용까지 확인. 발행/새 탭에서도 동일.

## 규칙 (템플릿 규칙 준수)

- shadcn 은 `@/components/ui/*` 직접 import, `cn()` 은 `@/lib/utils`. `ui/`·`miso-sdk/`·`utils.ts` 수정 금지.
- 색·라운딩은 `news.css` 의 시맨틱 토큰(`--nw-*`, 라이트/다크 쌍)으로만 조정 — 컴포넌트에 hex 하드코딩 금지. **예외**: `email.ts`(이메일 클라이언트는 CSS 변수 미지원이라 인라인 hex 불가피)·`coverage-bar.tsx`(차트 색)·구독 키워드의 `t.color` 점(사용자 지정 data-color).
- `React.StrictMode` 추가 금지.
- 데이터와 뷰 분리: 브랜딩·프리셋·수집 파라미터·톤은 `news-config.ts` 에만.

---

_검증: 실제 코더 템플릿에 오버레이 후 `tsc -b` + `vite build` 통과. 로컬 PB + mock LLM 환경에서 무의존성 CDP E2E — 강제 수집(fetch→요약→클러스터 파이프라인) → 홈 "오늘의 이슈" 클러스터 렌더 → 스토리(이슈 브리핑+소속 기사) → 브리핑 스트리밍 본문 + "메일로 만들기" 다이얼로그(이메일 본문+서식 복사) → 채팅 스타터 질문 + 코퍼스 근거 스트리밍 답변 + [n] 인용까지 콘솔 에러 0 으로 확인._
