# marketing-studio (boilerplate)

브랜드 마케팅 캠페인 스튜디오 앱용 template-grade 시작점 — Google Pomelli 류의
"URL → 브랜드 DNA → 캠페인 컨셉 → 채널별 크리에이티브" 플로우를 MISO 코더 스택으로 구현한 오버레이다.

- **브랜드 분석**: URL 하나로 PB 훅이 HTML/CSS/og:image/**사이트 이미지 갤러리**를 수집하고, MISO Direct LLM 이 브랜드 DNA(톤·개성·메시지·팔레트·폰트·로고)를 추출한다. 결과는 **DNA 벤토 보드**(로고·Aa 폰트·색 스와치·이미지 갤러리 카드)에서 전부 인라인 편집.
- **캠페인 컨셉**: 자유 프롬프트가 1급 입력(목표 6종은 선택) → 서로 다른 컨셉 4개. 브랜드 페이지에 **DNA 기반 캠페인 제안** 카드가 자동 생성된다(클릭 시 바로 진행).
- **크리에이티브 엔진**: diffusion 없이 **결정적 온브랜드 템플릿 렌더러** — 아키타입 6종 × 플랫폼 10종(한국 채널 포함). 텍스트 레이어는 브랜드 hex·카피 100% 정확, 이미지 레이어는 수집된 갤러리 이미지를 photo 아키타입 배경으로 자동/원클릭 배정. 플랫폼 원본 px PNG 다운로드.
- **영속**: 브랜드/캠페인/에셋이 PocketBase 에 저장된다.

> 이 폴더는 **베이스 코더 템플릿을 전제**한다. `src/components/ui/`(shadcn), `src/lib/miso-sdk/`, 설정파일은 템플릿에 이미 있으므로 여기 중복 포함하지 않는다.

---

## 아키텍처 — 제약 치환

| 일반적 구현 (Next.js Pomelli 클론) | 이 보일러플레이트 |
| --- | --- |
| Next.js API routes + Prisma/SQLite | Vite SPA + PocketBase 컬렉션 3종 |
| Playwright 스크레이핑 + 스크린샷 | PB Goja 훅 `proxyFetch` HTML/CSS/이미지 수집 + 정규식 파싱 |
| 외부 LLM API 키 | MISO Direct LLM SDK (외부 키 불필요) |
| AI 이미지 생성 (nano-banana 등) | 결정적 브랜드 템플릿 렌더러 + `html-to-image` PNG |

vision 분석은 best-effort: 스크레이프 훅이 og:image 를 base64 로 내려주면 LLM 에 이미지 파트로
전달하고, 모델이 vision 을 지원하지 않으면 자동으로 텍스트 전용으로 폴백한다.

## 파일 구성

```
api/marketing_scrape.pb.js             POST /api/marketing/scrape (수집·파싱)
                                       GET  /api/marketing/image (외부 이미지 same-origin 프록시)
api/setup_marketing_collections.mjs    PB 컬렉션 3종 upsert
src/App.tsx                            라우터 + .ms-app 테마 래퍼 + 탑바 — 템플릿 App 대체
src/styles/marketing.css               앱 디자인 시스템 (다크 스튜디오 토큰·세리프 디스플레이)
src/pages/MarketingStudioPage.tsx      홈 — URL 분석·데모 생성·브랜드 목록
src/pages/BrandPage.tsx                브랜드 킷 편집 + 캠페인 생성/목록
src/pages/CampaignPage.tsx             컨셉 4종 선택 + 플랫폼 선택 + 에셋 그리드
src/pages/AssetEditorPage.tsx          에셋 에디터 (실시간 캔버스 + 자동 저장 + PNG)
src/lib/marketing/
  config.ts                            ★ 교체 지점 — 라벨·캠페인 목표·LLM 프롬프트 SSOT
  types.ts / platforms.ts / archetypes.ts / palette.ts
  llm.ts / brand-analyzer.ts / campaign-generator.ts / copy-generator.ts
  store.ts / demo.ts / media.ts / export-png.ts / use-canvas-scale.ts
src/components/marketing/
  creative-canvas.tsx                  아키타입 디스패치 + scale-to-fit + export ref
  archetypes/                          shared.tsx + 6종 렌더러
  brand-kit-form.tsx / concept-card.tsx / asset-card.tsx / editor-controls.tsx
```

## 플랫폼 카탈로그 (10종 — 원본 px)

| id | 채널 | 크기 | 카피 캡 (한글 자수) |
| --- | --- | --- | --- |
| `instagram_feed` | Instagram | 1080×1080 | 24/60/8 |
| `instagram_story` | Instagram | 1080×1920 (하단 18% 안전영역) | 16/–/8 |
| `linkedin_post` | LinkedIn | 1200×1200 | 30/80/8 |
| `facebook_ad` | Facebook | 1080×1080 | 20/60/8 |
| `x_post` | X | 1600×900 | 18/70/8 |
| `web_banner` | 웹 | 1920×960 | 18/45/8 |
| `email_header` | 이메일 | 1200×400 | 22/40/8 |
| `youtube_thumbnail` | YouTube | 1280×720 | 12/–/– |
| `kakao_channel` | 카카오톡 채널 | 800×800 | 20/50/8 |
| `naver_blog_thumbnail` | 네이버 블로그 | 800×450 | 22/30/– |

플랫폼 추가 = `platforms.ts` 에 스펙 1개 추가 (아키타입·캔버스·PNG 는 자동 대응).

## 아키타입 (6종)

| id | 구도 | 어울리는 메시지 |
| --- | --- | --- |
| `gradient` | 브랜드 색 대각 그라디언트 + 좌하단 텍스트 스택 | 히어로·발표 |
| `split` | 텍스트 패널 × 브랜드 블록 2분할 (가로/세로 자동) | 제품·구독 |
| `badge` | 중앙 정렬 + 인셋 프레임 + 캡슐 CTA | 공지·초대 |
| `outline` | 대형 아웃라인 타이포 | 선언·의견 |
| `photo` | 이미지 백드롭 + 하단 스크림 — 수집 갤러리에서 자동/원클릭 배정 | 실사·후킹 |
| `pattern` | 기하 패턴(도트/스트라이프/링) + 중앙 카드 | 프로모션 |

아키타입은 에셋 생성 시 플랫폼 기본값 + 컨셉 인덱스로 자동 배정되고, 에디터에서 자유 전환.
팔레트 변형은 브랜드 색 수 × 3 모드(브랜드색 배경/페이퍼/다크) — 잉크 색은 항상 대비 기준 자동
선택이라 어떤 조합도 가독성이 깨지지 않는다 (`palette.ts`).

## 앱 디자인 시스템 — "교정쇄(Proof) 에디토리얼"

앱 크롬은 shadcn 기본값이 아니라 `src/styles/marketing.css` 의 자체 디자인 시스템을 쓴다.
컨셉: 인쇄소 교정지 위에 크리에이티브를 올려놓고 보는 도구. shadcn 문법(균일 보더 카드·기본
인풋·h-9 버튼)을 구조적으로 쓰지 않는다.

- **페이퍼 + 잉크 + 버밀리언**: 웜 아이보리(`#f7f4ec`, 종이 노이즈 텍스처) 배경, 잉크 블랙,
  버밀리언(`#e8501f`) 단일 액센트. `.ms-app` 래퍼에서 shadcn 토큰을 스코프 재정의하므로
  템플릿 `ui/` 는 무수정.
- **박스 대신 헤어라인**: 구획은 보더 카드가 아니라 `.ms-rule`(번호+라벨+풀폭 헤어라인)과
  여백으로. 표면이 필요한 곳만 `.ms-sheet`/`.ms-cell`(무보더+그림자), 도판은 `.ms-plate`
  (흰 매트+모노 캡션 `PL.01 · …`).
- **화면당 하나의 잉크 반전**: DNA 보드의 Colors 셀, 에디터의 캔버스 스테이지(`.ms-stage`)가
  잉크 블랙 — 위계를 만드는 대비 모먼트.
- **타이포**: 한글은 Pretendard 계열 웨이트 대비(`.ms-display` 800 타이트 자간, `.ms-hero`
  클램프 오버사이즈), 넘버링·영문 디스플레이는 Archivo 900(`.ms-num`), 수치·캡션·hex 는
  IBM Plex Mono(`.ms-mono`) — 웹폰트 실패 시 시스템 폴백.
- **컨트롤**: 인라인 편집은 언더라인 인풋(`.ms-uline`), 선택형은 필 토글(`.ms-pill`, 선택=잉크),
  주 액션은 대형 버밀리언 CTA(`.ms-cta`, 화살표 마이크로 모션), 보조 액션은 `.ms-linkact`.
- **모션**: 페이지 로드 스태거 리빌(`.ms-reveal`~`-4`, reduced-motion 존중), 도판 호버 리프트.
- **캔버스와 분리**: 이 토큰은 앱 크롬 전용. 크리에이티브 캔버스는 `resolvePalette`(브랜드 킷)
  색만 쓰므로 앱 테마를 바꿔도 산출물은 변하지 않는다.

앱 무드를 바꾸려면 `marketing.css` 의 `.ms-app` 토큰 블록만 수정하면 된다.

## 사용법

### 1. 파일 배치 + 의존성

이 폴더의 `api/`, `src/` 를 생성된 앱의 동일 경로에 복사한다 (`src/App.tsx` 는 기존 파일 교체).

```bash
pnpm add html-to-image@1.11.13
node api/setup_marketing_collections.mjs
```

`html-to-image` 는 PNG 다운로드 시에만 dynamic import 된다 (초기 번들 무관).

### 2. 플로우

홈에서 URL 입력 → DNA 벤토 보드 확인·수정 → 제안 카드 클릭 또는 프롬프트 입력(목표는 선택) →
컨셉 4개 중 선택 → 채널 선택 후 에셋 일괄 생성 → 에디터에서 카피·컴포지션·팔레트·배경 이미지
조정 → PNG 다운로드.

LLM 없이 결과물부터 보려면 홈의 **"데모 브랜드로 시작"** — 정적 브랜드+캠페인+에셋 4종이 만들어진다.

### 3. 커스터마이징

- 라벨·캠페인 목표·프롬프트: `src/lib/marketing/config.ts` 만.
- 플랫폼/카피 캡: `platforms.ts`. 아키타입 추가: `types.ts` 유니온 + `archetypes.ts` 메타 + `archetypes/` 컴포넌트 + `creative-canvas.tsx` 디스패치 4곳을 함께.
- 캔버스는 **플랫폼 원본 px 고정 좌표계** — 컴포넌트 내부에 반응형 단위(vw/%, sm: 등) 금지. 크기는 전부 `unit`(=min(w,h)/100) 기반.

## 한계와 확장 노트

- **JS 렌더 SPA / EUC-KR 사이트**: 훅은 정적 HTML 만 읽는다(UTF-8 디코드). 본문이 빈약하면 브랜드 킷 화면에서 직접 보완하는 흐름을 안내하라.
- **외부 이미지**: 로고·배경 이미지는 `GET /api/marketing/image` 프록시로 로드되어 CORS 오염 없이 PNG 내보내기가 된다. 프록시가 실패하면 워드마크 폴백.
- **이미지·비디오 생성 미포함**: 플랫폼에 이미지 생성 프로바이더가 없다. 사용자가 외부 이미지 생성 API(예: Gemini 이미지, DALL·E)를 연결하고 싶다면 `recipes/miso/external-api/pocketbase-hook/README.md` + `recipes/miso/env-secrets/README.md` 패턴으로 훅 라우트를 추가하고, 결과 URL 을 에셋 `style.bgImageUrl`(photo 아키타입)에 넣는 지점부터 확장하라.

## 규칙 (템플릿 규칙 준수)

- `React.StrictMode` 추가 금지, `ui/`·`miso-sdk/` 수정 금지 (템플릿 관리 영역).
- PB 훅 헬퍼는 핸들러 내부 스코프에 유지 (Goja 파일 스코프 함정). `$http.send()` 직접 호출 금지 — 항상 `proxyFetch`.
- 캔버스 색은 `resolvePalette` 결과(브랜드 킷 유래)만 사용 — 아키타입에 하드코딩 hex 를 넣지 말 것 (스크림·잉크 폴백 상수 제외).

---

_검증: 실제 코더 템플릿에 오버레이 후 `tsc --noEmit` + `vite build` 통과, 데모 워크스페이스 렌더 확인._
