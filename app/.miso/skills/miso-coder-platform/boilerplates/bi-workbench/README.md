# bi-workbench (boilerplate)

파일을 올리면 진입 즉시 AI가 데이터를 읽어 인사이트를 큐레이션하고, EDA·인과분석으로
파고들며, 자유 배치 대시보드로 공유하는 **AI-first 데이터분석·시각화 스튜디오**
MISO 웹사이트 앱 보일러플레이트. 바이브코더가 자기 회사 데이터에 맞춘 프리미엄
분석 도구를 코더 앱으로 생성하는 것을 목표로 한다.

IA는 Graphic Walker식 **Data · Visualization · Dashboard** 3메뉴이고, Data 탭은
Rath식 EDA(자동 인사이트 갤러리)와 인과분석(PC 알고리즘 + do-개입 What-if)을
담는다. Superset의 제품 모델에서 분석에 불필요한 것(DB 커넥터·RBAC·SQL Lab·
시맨틱 레이어 관리·서버 캐시/워커)은 버린다.

## 아키텍처

- **QuerySpec 단일 통화** — UI·추천 엔진·대시보드가 같은 선언적 질의를 쓴다.
  `ChartSpec → (bi-derive) → QuerySpec → (bi-engine) → QueryResult`는 전부 순수 함수라
  같은 spec은 항상 같은 결과를 낳는다.
- **인메모리 컬럼 지향 엔진** — 원 설계안의 DuckDB-WASM 대신 TypeScript
  인메모리 엔진(`bi-engine.ts`)을 쓴다(승인된 단순화 — WASM 자산 35MB와 COI 제약
  제거). 필터·변환(bin/dateTrunc/datePart/log)·집계·fold·topN을 지원하며 수십만 행
  집계가 수 ms~수십 ms에 끝난다. 업로드 상한 500k행.
- **파일이 정본** — 업로드 rows는 PocketBase 레코드로 쪼개지 않고
  `bi_datasets.data`에 **컬럼 지향 JSON 파일 1개**로 저장한다. 재방문 시 파일을
  내려받아 메모리 테이블을 복원한다(원본 재파싱 없음).
- **AI-first — LLM을 최대한 활용하는 것이 목표** — miso-llm(direct LLM)으로
  진입 즉시 인사이트 큐레이션(AutoPilot), 자연어→차트(NL2Chart 챗), Copilot 다음
  탐색 제안, 인과 그래프 해석, Explainer 서사를 **자동으로** 수행한다(`bi-ai.ts`).
  통계 엔진(`bi-insights.ts`·`bi-explain.ts`·`bi-causal.ts`)은 LLM이 읽고 서술하는
  **재료**이고, 모델이 연결되지 않을 때만 통계 결과가 조용히 그대로 노출된다(조용히
  열화될 뿐 깨지지 않는다). LLM 출력은 자유 코드가 아니라 **ChartSpec JSON만** 허용되며,
  `sanitizeChartSpec` 검증 파이프라인(fid 존재·agg/mark 화이트리스트, 실패 시 1회
  재생성)을 통과해야 렌더된다. 입력은 스키마 카드+샘플 소량만 전송한다.

## 화면

IA는 상단 **Data · Visualization · Dashboard** 3메뉴다.

| 라우트 | 화면 |
|--------|------|
| `/data` | 데이터셋 라이브러리 + 업로드(드롭/붙여넣기/샘플 3종) |
| `/data/:id` | 프로파일 탭 — 품질 배너·추천 차트 스트립·필드 카드·AutoPilot 리포트 |
| `/data/:id/grid` | 그리드 탭 — 가상 스크롤·필터 바·컬럼 메뉴·상태바 |
| `/data/:id/eda` | 인사이트 탭 — 진입 즉시 AI 큐레이션(요약+제목·해설), 8종 패턴 갤러리·유형 필터 |
| `/data/:id/causal` | 인과분석 탭 — PC 알고리즘 관계 그래프·노드 클릭 타깃·do-개입 What-if(±2σ)·부트스트랩 엣지 안정성·배경지식 제약(금지/강제)·자동 AI 해석 |
| `/viz`, `/viz/:id` | Visualization — 인코딩 shelf·mark 자동 결정·계산 필드·조인·저장된 지표·facet 트렐리스·시계열(이동평균·예측)·undo/redo·URL 동기화·차트 저장·datum [왜?](Explainer) |
| (우측 패널) | AI 챗 — 자연어→차트 미리보기 카드→[캔버스에 열기], Copilot 제안 칩 |
| `/dash`, `/dash/:id` | Dashboard — 자유 배치 그리드(드래그 이동·SE 리사이즈·충돌 컴팩션)·전역 필터·크로스필터 |
| `/settings` | 테마·성능 한도·저장 용량·일괄 삭제 |

`/`와 구 `/d/:id*` 라우트는 새 경로로 자동 리다이렉트된다(`?spec=`/`?chart=` 보존).
⌘K 커맨드 팔레트, 1/2/3/4 탭 전환, ⌘Z/⌘⇧Z, ⌘S 저장. 디자인은 **Atlassian Design System**(primary blue #0052CC,
navy ink #172B4D, 라이트그레이 서피스, Lozenge 상태 배지, 14px 밀도, 2겹 카드 그림자),
기본 라이트.

## 분석 기능 (프로덕션급)

데모 MVP가 아니라 Rath·Graphic Walker·Superset의 실전 기능을 인메모리 엔진 위에
순수 함수로 구현한다. 전부 QuerySpec/ChartSpec 단일 통화를 거쳐 렌더된다.

- **계산/파생 필드** (`bi-formula.ts`) — 사칙연산·필드 참조 표현식(`[revenue]-[cost]`)을
  행 단위로 계산해 파생 컬럼을 만든다(0 나눗셈 null, 타입 승격). Superset 계산컬럼 대응.
- **멀티테이블 조인·시맨틱 레이어** (`bi-join.ts`) — 팩트→디멘션 관계를 룩업 조인으로
  denormalize한다(오른쪽 첫 매칭, 왼쪽 카디널리티 보존, 팬아웃 없음). 엔진/차트는
  단일 테이블만 보므로 blast radius가 0. inner/left 지원.
- **저장된 지표** (`bi-metric.ts`) — 행 계산으로는 불가한 **집계 후 산술**
  (`sum([revenue])/countDistinct([customer])` = 객단가)을 pseudo-field로 저장한다.
  자체 파서가 base 집계를 뽑아 그룹별로 계산·평가한다.
- **facet / 트렐리스 + 채널 확장** (`chart-surfaces.tsx`) — row/column 소형 다중,
  산점도 shape/opacity 채널, 히트맵·박스플롯 서피스.
- **대량 산점도 밀도 렌더링** (`bi-raster.ts` + `scatter-raster-surface.tsx`) — 포인트가
  임계치(2,000)를 넘으면 **다운샘플링 없이 전 포인트를 픽셀 그리드에 비닝**해 로그-알파
  밀도로 캔버스 렌더한다(Datashader 방식). 휠 줌·드래그 팬은 뷰를 재비닝(LOD)해 겹친
  점을 덧그리지 않고 다시 집계하므로 20만 행도 끊김이 없다. 산점도 상한 200k행,
  그 아래는 기존 SVG 심볼(shape/opacity)로 렌더한다. WebGL 의존이 없어 헤드리스
  환경에서도 동일하게 검증된다.
- **시계열 심화** (`bi-timeseries.ts`) — 후행 이동평균(미래 누출 없음)·전기간 대비
  변화율(%)·OLS 선형 예측 외삽. temporal 라인/영역에 점선 오버레이+예측 꼬리.
- **인과 심화** (`bi-causal.ts`) — PC 알고리즘(조건부 독립→v구조→Meek→선형 SCM→
  do-개입)에 **부트스트랩 엣지 안정성**(재표집 재현 빈도)과 **배경지식 제약**
  (연결 금지·방향 강제)을 더한다.

## 코드 구조 (모듈 맵)

이어서 개선할 때 아래 지도에서 담당 파일을 찾는다. 새 차트·집계·분석을 추가할 때도
전부 `ChartSpec → bi-derive → QuerySpec → bi-engine → QueryResult` 파이프라인에 얹는다.
lib는 렌더·DOM과 무관한 순수 함수라 단위 테스트로 바로 검증된다.

### 엔진·데이터 모델 (`src/lib/`)

| 파일 | 역할 |
|------|------|
| `bi-types.ts` | 전체 타입 SSOT — `FieldMeta`/`DataTable`/`QuerySpec`/`ChartSpec`/`QueryResult` + 상한 상수(`MAX_CHART_ROWS`, `MAX_SCATTER_ROWS`). 새 mark/agg/변환은 여기 타입부터. |
| `bi-engine.ts` | 인메모리 컬럼 지향 질의 엔진 — filter→transform(bin/dateTrunc/datePart/log)→aggregate→fold→topN. QuerySpec in, QueryResult out. |
| `bi-profile.ts` | 업로드 rows → `DataTable` 빌드 + 타입 추론 + 필드 프로파일(히스토그램·상위값·시간범위). temporal을 epoch ms로 정규화. |
| `bi-derive.ts` | ChartSpec(인코딩 shelf) → QuerySpec 변환. mark 자동 결정표·유도 규칙. |
| `bi-ingest.ts` | 파일/클립보드/샘플 파싱(CSV/TSV/XLSX/JSON, xlsx 동적 import). |
| `bi-samples.ts` | 내장 데모 데이터셋 3종. |
| `bi-format.ts` | 숫자·날짜·축 라벨 포매팅. |
| `bi-store.ts` | PocketBase 영속 레이어 — 데이터셋 파일 왕복·차트·대시보드 CRUD. |
| `bi-hooks.ts` | TanStack Query 훅 — 데이터셋/차트/대시보드 조회·변이. |

### 분석 라이브러리 (순수 함수, `src/lib/`)

| 파일 | 역할 |
|------|------|
| `bi-formula.ts` | 계산/파생 필드 표현식 파서·평가(행 단위, 0 나눗셈 null). |
| `bi-join.ts` | 팩트→디멘션 룩업 조인 denormalize(팬아웃 없음, inner/left). |
| `bi-metric.ts` | 저장된 지표(집계 후 산술) 파서·그룹별 평가. |
| `bi-timeseries.ts` | 후행 이동평균·변화율·OLS 선형 예측 외삽. |
| `bi-raster.ts` | 대량 산점도 밀도 비닝·로그알파 RGBA·nice ticks·bounds(캔버스 무관 순수). |
| `bi-insights.ts` | EDA 자동 인사이트 8종 패턴 탐지. |
| `bi-causal.ts` | PC 알고리즘 인과 발견(조건부 독립→v구조→Meek→선형 SCM→do-개입) + 부트스트랩 안정성 + 배경지식 제약. |

### AI 레이어 (`src/lib/`)

| 파일 | 역할 |
|------|------|
| `bi-ai.ts` | miso-llm 호출 — AutoPilot 큐레이션·NL2Chart·Copilot 제안·인과 해석. 출력은 ChartSpec JSON만, `sanitizeChartSpec` 검증. |
| `bi-explain.ts` | datum "왜?" 서사 재료 생성(통계 근거). |

### 화면 (`src/pages/`, `src/layout/`)

| 파일 | 역할 |
|------|------|
| `layout/app-shell.tsx` | 3메뉴 상단 셸 · ⌘K 커맨드 팔레트 · 단축키. |
| `pages/HomePage.tsx` | `/data` — 데이터셋 라이브러리 + 업로드. |
| `pages/WorkspacePage.tsx` | `/data/:id` — 프로파일·그리드·EDA·인과 4탭 셸. |
| `pages/VizPage.tsx` | `/viz` — 인코딩 shelf 탐색 + AI 챗. |
| `pages/DashboardsPage.tsx` · `DashboardDetailPage.tsx` | `/dash` — 대시보드 목록·자유 배치 편집. |
| `pages/SettingsPage.tsx` | `/settings` — 테마·성능 한도·저장 용량. |

### 컴포넌트 (`src/components/bi/`)

| 파일 | 역할 |
|------|------|
| `bi-chart.tsx` | ChartSpec → 렌더 디스패처(recharts + 래스터 산점도 분기). `memo`. |
| `chart-surfaces.tsx` | facet 트렐리스 · 산점도 심볼 채널 · 히트맵 · 박스플롯 서피스. |
| `scatter-raster-surface.tsx` | 캔버스 밀도 산점도 — 휠 줌·드래그 팬·SVG 축·툴팁. |
| `explore-tab.tsx` · `explore-shelf.tsx` | 인코딩 shelf 탐색 UI(mark 전환·pill 메뉴). |
| `profile-tab.tsx` · `grid-tab.tsx` · `insights-tab.tsx` · `causal-tab.tsx` | Data 탭 4종(프로파일·그리드·EDA·인과). |
| `field-list-panel.tsx` | 필드 목록 · pill 메뉴 · 계산필드/지표 진입점. |
| `calculated-field-dialog.tsx` · `relationship-dialog.tsx` · `metric-dialog.tsx` | 계산필드·조인·지표 편집 다이얼로그. |
| `filter-bar.tsx` | 로컬·전역 필터 UI. |
| `import-wizard.tsx` | 업로드 확인(이름·시트 선택). |
| `add-to-dashboard-dialog.tsx` · `dashboard-grid.tsx` | 대시보드 추가 · 자유 배치 그리드(포인터 자체구현, `memo`). |
| `ai-panel.tsx` | 우측 AI 챗 패널(NL2Chart·Copilot 칩). |
| `explain-sheet.tsx` · `autopilot-dialog.tsx` | 왜? 시트 · AutoPilot 리포트. |
| `lozenge.tsx` · `status-bar.tsx` | Lozenge 상태 배지 · 상태바. |

### 셋업 스크립트 (`api/`)

| 파일 | 역할 |
|------|------|
| `setup_bi_collections.mjs` | 내부 런타임 API로 3개 PocketBase 컬렉션 생성. |
| `bi_runtime_smoke.mjs` | 파일 왕복·spec 왕복 런타임 스모크. |

### 오버레이 시 (코더용)

위 `src/**`·`api/**`·`src/App.tsx`·`src/bi-theme.css`를 베이스 코더 템플릿의 같은
경로에 덮어쓴다. `src/components/ui`(shadcn 45종), `src/lib/miso-sdk`, `src/lib/utils.ts`,
lockfile, Vite 설정은 템플릿에 이미 있으므로 복사하지 않는다. 적용 시 `xlsx@0.18.5`
하나만 추가한다.

## PocketBase Collections

`api/setup_bi_collections.mjs`를 내부 런타임 API로 실행하면 3개 컬렉션이 생긴다.

| 컬렉션 | 역할 |
|--------|------|
| `bi_datasets` | 메타(name/rowCount/fields JSON/version) + `data` 파일(컬럼 지향 JSON 정본) |
| `bi_charts` | ChartSpec 저장본 |
| `bi_dashboards` | DashboardConfig(위젯·전역필터·crossFilter) |

스타터 정책으로 API rule은 오픈이다. 로그인/워크스페이스 롤을 붙일 때 조인다.

## Data Flow

1. 파일(CSV/TSV/XLSX/JSON)·클립보드·내장 샘플 → `bi-ingest`가 파싱 (xlsx는 동적 import).
2. `bi-profile.buildTable`이 타입 추론(규칙 기반) + 프로파일(히스토그램·상위값·시간범위)을 계산하고 temporal 값을 epoch ms로 정규화한다.
3. 확인 다이얼로그에서 이름·시트 선택 후 `bi_datasets`에 파일과 함께 저장.
4. 탐색: shelf 인코딩 → `bi-derive`가 mark 자동 결정표와 유도 규칙으로 QuerySpec 생성 → `bi-engine.runQuery`.
5. 저장 차트는 spec JSON으로, 대시보드는 위젯 배열로 영속화. 전역 필터·크로스필터는 위젯 spec 필터에 concat된다.
6. spec은 `?spec=`(base64url) 또는 `?chart=<id>`로 URL 동기화되어 새로고침·공유가 안전하다.

## Package Policy

템플릿 기존 의존성(React 19, React Router, TanStack Query, shadcn, PocketBase SDK,
recharts, lucide-react)만 쓴다. 적용 시 `xlsx@0.18.5` 하나만 추가한다.
deck.gl·ECharts·지도 SDK·d3·react-grid-layout 계열을 추가하지 않는다(자유 그리드는
`dashboard-grid.tsx`가 포인터 이벤트로 자체 구현, 인과 엔진은 `bi-causal.ts`가 순수 TS로
PC 알고리즘·SCM을 구현). 색상은 shadcn 시맨틱 토큰과 `--color-chart-*` 변수, 프리미엄
토큰은 `bi-theme.css`의 oklch만 사용한다(Atlassian hex를 oklch로 변환, 인라인 hex 금지
— 데이터 주도 위치/강도/색상 스타일만 예외). Lozenge는 `components/bi/lozenge.tsx`.

## Verification

- `node --test tools-external/coder/tests/bi-workbench-query-engine.test.mjs` — 엔진·추론·derive·인사이트 단위 테스트
- `node --test tools-external/coder/tests/miso-opencode-assets-contract.test.mjs`
- 일회용 앱에 overlay 후 `npx tsc --noEmit` + `vite build`
- 로컬 PocketBase로 `PB_API_BASE=... PB_SUPERUSER_TOKEN=... node api/setup_bi_collections.mjs` 후
  `node api/bi_runtime_smoke.mjs` — 파일 왕복·spec 왕복 검증
- 브라우저 시나리오: 샘플 가져오기 → 프로파일 추천 카드 → 그리드 필터 →
  탐색 shelf 조작(mark 전환·pill 메뉴) → 차트 저장 → 대시보드 추가 →
  위젯 클릭 크로스필터 → 새로고침 후 전부 복원
- v2 시나리오: Data→인사이트 진입 즉시 AI 요약 배너+큐레이션 카드 → Data→인과분석
  변수 선택 → 관계 그래프+자동 AI 해석 → 노드 클릭 타깃 → What-if 슬라이더로 예상 Δ →
  Dashboard 편집 모드에서 위젯 헤더 드래그 이동·SE 코너 리사이즈·충돌 컴팩션
- AI 시나리오(모델 연결 시): AI 패널 질문 → 스트리밍 답변+차트 카드 → [캔버스에
  열기] → Copilot 칩. 모델 미연결이면 각 지점에서 통계 결과가 조용히 노출됨을 확인
- v3 시나리오: 계산 필드 추가(파생 컬럼) → 조인(관계 편집·시맨틱 필드 편입) →
  저장된 지표(객단가) → facet 행/열 분할 → 시계열 이동평균+예측 오버레이 →
  인과 부트스트랩 안정성(%)+배경지식 제약(금지/강제 엣지)
- `bi-workbench-query-engine.test.mjs`는 인과(analyzeCausal x→y→z 사슬·독립 변수·
  do-개입 전파·배경지식·부트스트랩 안정성)와 계산/조인/지표/시계열 변환까지 포함한다
