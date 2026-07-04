# presentation (boilerplate)

웹 프리젠테이션(슬라이드 덱) 앱용 template-grade 시작점.
**Vite + React + 자체 슬라이드 엔진 + pptxgenjs** 로 구성된 오버레이다.
슬라이드는 화면(16:9 웹)과 **편집 가능한 PPTX 다운로드** 양쪽으로 렌더된다.

> 이 폴더는 **베이스 코더 템플릿을 전제**한다. `src/components/ui/`(shadcn), `src/lib/utils.ts`, 설정파일은 템플릿에 이미 있으므로 여기 중복 포함하지 않는다.

---

## 핵심 개념 — 데이터 주도 슬라이드

슬라이드는 JSX 가 아니라 **`src/lib/deck-content.ts` 의 타입된 데이터**로 정의한다.
같은 데이터를 ① React 레이아웃 컴포넌트(1280×720 고정 캔버스)와 ② pptxgenjs 내보내기가 함께 소비하므로,
**deck-content.ts 만 수정하면 화면과 PPTX 가 동시에 바뀐다.**

```
deck-content.ts (콘텐츠)  ──▶  layouts/*.tsx (웹 렌더)
                          └─▶  export-pptx.ts (PPTX 텍스트박스·도형·네이티브 차트)
```

- 콘텐츠 수정 = `deck-content.ts` 만.
- 룩앤필 수정 = `deck/themes.ts`(색·폰트 SSOT) + `styles/deck.css`.
- 새 레이아웃 추가 = `types.ts` 유니온 + `layouts/` 컴포넌트 + `slide-renderer.tsx` 분기 + `export-pptx.ts` 분기 4곳을 함께.

## 파일 구성

```
src/App.tsx                                BrowserRouter + Routes — 템플릿 App 대체
src/pages/PresentationPage.tsx             덱 셸 (스테이지·컨트롤·오버뷰·PPTX 다운로드)
src/lib/deck-content.ts                    ★ 교체 지점 — 덱 설정 + 슬라이드 20장 데모
src/lib/deck/
  types.ts                                 SlideSpec 유니온 (레이아웃 17종) + 캔버스 상수
  themes.ts                                테마 5종 (CSS 변수·PPTX 색 단일 소스)
  use-deck.ts                              키보드·스와이프·해시(#/3) 내비 + 스케일 훅
  export-pptx.ts                           레이아웃별 PPTX 내보내기 (편집 가능한 텍스트)
src/components/deck/
  slide-renderer.tsx                       layout → 컴포넌트 디스패치 + 프레임
  slide-frame.tsx                          배경 변형(default/soft/invert)·푸터·워시
  slide-image.tsx                          이미지 or 테마 추상 플레이스홀더
  deck-controls.tsx                        이전/다음·오버뷰·전체화면·PPTX 버튼
  deck-overview.tsx                        전체 슬라이드 그리드 (O 키)
  layouts/                                 17종 레이아웃 (아래 표)
src/styles/deck.css                        덱 전용 스타일 — 색은 CSS 변수만 사용
```

## 레이아웃 카탈로그 (sparse → dense)

| layout | 용도 | 밀도 |
|--------|------|------|
| `title` | 표지 — 키커·대형 타이틀·발표자·날짜 | sparse |
| `section` | 섹션 구분 — 대형 번호 + 제목 | sparse |
| `statement` | 한 문장 강조 (highlight 부분 강조) | sparse |
| `quote` | 인용 + 발화자 | sparse |
| `end` | 마무리 — 감사·연락처 | sparse |
| `agenda` | 목차 (번호 리스트, 6개↑ 자동 2열) | 중간 |
| `media` | 풀블리드 이미지 + 오버레이 캡션 | 중간 |
| `text-image` | 텍스트·이미지 분할 (imageSide) | 중간 |
| `metrics` | KPI 카드 그리드 (2~6개, delta·trend) | 중간 |
| `cards` | 아이콘 카드 그리드 (2~6개) | 중간 |
| `team` | 인물 그리드 (사진 없으면 이니셜) | 중간 |
| `gallery` | 이미지 그리드 + 캡션 | 중간 |
| `bullets` | 제목 + 불릿 (columns 1·2) | dense |
| `timeline` | 수평 로드맵 (done/now/next) | dense |
| `compare` | 컬럼 비교·요금제 (highlight) | dense |
| `chart` | recharts ↔ PPTX 네이티브 차트 (bar/line/area/donut) + takeaways | dense |
| `table` | 데이터 테이블 (emphasisCol) | dense |

슬라이드 공통 옵션: `background: "default" | "soft" | "invert"`, `notes`(발표자 노트 — PPTX 노트로 내보냄).

## 테마 (22종)

`deckConfig.theme` 한 줄로 전체 덱의 색·폰트·라운딩이 바뀐다.

**다크 11종**

| id | 무드 |
|----|------|
| `aurora` | 딥 네이비 + 바이올렛·민트 — 테크 키노트 |
| `noir` | 블랙·화이트 하이콘트라스트 + 애시드 옐로 — 볼드 미니멀 |
| `cobalt` | 새터레이티드 코발트 원컬러 — 대담한 키노트 |
| `midnight` | 청흑 + 일렉트릭 시안 — 나이트 오퍼레이션 |
| `crimson` | 니어블랙 + 크림슨 — 시네마틱 임팩트 |
| `plum` | 딥 퍼플 + 오키드 — 몽환적 프로덕트 |
| `ember` | 웜 차콜 + 엠버 오렌지 — 열기 있는 스토리텔링 |
| `steel` | 그래파이트 + 스틸 블루 — 시크한 다크 코퍼레이트 |
| `moss` | 딥 파인 + 라임 세이지 — 다크 내추럴 |
| `royal` | 잉크 바이올렛 + 골드 + 명조 — 럭스 프리미엄 |
| `terminal` | 깃허브 다크 + 터미널 그린 — 개발자 브리핑 |

**라이트 11종**

| id | 무드 |
|----|------|
| `editorial` | 웜 페이퍼 + 명조 헤드라인 + 버밀리언 — 매거진 |
| `slate` | 화이트 + 네이비·블루 — 클린 코퍼레이트 |
| `verdant` | 세이지 그린 — 차분한 내추럴 |
| `porcelain` | 웜 그레이 화이트 — 애플식 절제 미니멀 |
| `latte` | 크림 + 에스프레소·카라멜 + 명조 — 카페 웜톤 |
| `ocean` | 페일 블루 + 딥 틸 — 시원한 클린 |
| `blush` | 웜 핑크 크림 + 로즈 — 소프트 브랜드 |
| `sunrise` | 아이보리 + 코랄·앰버 — 에너제틱 스타트업 |
| `pop` | 화이트 + 비비드 마젠타·시안 — 플레이풀 이벤트 |
| `newsprint` | 오프화이트 + 블랙 + 레드 — 스위스 타이포그래피 |
| `lavender` | 소프트 라벤더 + 딥 바이올렛 — 차분한 파스텔 |

새 테마 = `themes.ts` 의 `DECK_THEMES` 에 항목 추가 + `types.ts` 의 `DeckThemeId` 유니온에 id 추가 (hex 필수 — PPTX 와 공유).
브랜드 색을 받았으면 기존 테마를 수정하지 말고 새 id 를 추가하라.

## ★ 필수 교체 — 배포 전 반드시 확인

> **`src/lib/deck-content.ts` 는 NOVA 라는 가상 회사의 데모 덱이다. 전체를 사용자 내용으로 교체하라.**

| 항목 | 현재 더미값 |
|------|------------|
| `deckConfig.title` | `"NOVA 2026 상반기 비즈니스 리뷰"` |
| `deckConfig.footer` | `"NOVA · Confidential"` |
| `slides[*]` | NOVA 데모 슬라이드 20장 |
| 이미지 `src` | 전부 비어 있음(추상 플레이스홀더) — 실제 이미지 URL/자산으로 교체 |

## 의존성

```bash
pnpm add pptxgenjs@4.0.1
```

pptxgenjs 는 PPTX 다운로드 버튼을 누를 때만 dynamic import 로 로드된다(초기 번들 무관).
recharts·lucide-react 는 베이스 템플릿에 이미 있다.

## 사용법

### 1. 파일 배치
위 파일들을 코더 템플릿의 동일 경로에 배치한다(`src/App.tsx` 는 기존 파일 교체). `pnpm add pptxgenjs@4.0.1` 실행.

### 2. 콘텐츠 교체
`src/lib/deck-content.ts` 의 `deckConfig` 와 `slides` 배열을 사용자의 실제 내용으로 교체한다.
슬라이드 필드는 `src/lib/deck/types.ts` 의 타입이 가이드한다 — 타입 에러가 나면 잘못 쓴 것.

### 3. 테마 선택
`deckConfig.theme` 변경. 시각 방향 자체를 새로 잡아야 하면 `@design` 에이전트로 전환해
`themes.ts` 토큰과 `deck.css` 를 다듬는다 (색은 반드시 hex — PPTX 공유).

### 4. 이미지
`SlideImage.src` 가 비어 있으면 테마 추상 플레이스홀더가 렌더된다.
실제 이미지는 `/public` 자산, PocketBase 파일 URL, 외부 URL 모두 가능.
PPTX 내보내기도 같은 src 를 fetch 해 삽입한다(실패 시 플레이스홀더 도형).

### 5. 조작
`←/→·Space` 이동, `O` 오버뷰, `F` 전체화면, 우하단 컨트롤 바에서 PPTX 다운로드.
URL 해시(`#/7`)로 특정 슬라이드 공유 가능.

## 규칙 (템플릿 규칙 준수)

- 덱 캔버스는 **1280×720 고정 px 좌표계**다. 반응형 단위(vw/%, sm: 등)를 슬라이드 내부에 쓰지 말 것 — PPTX 좌표와 어긋난다.
- 색은 `deck.css`/컴포넌트에 hex 직접 쓰지 말고 **`--deck-*` CSS 변수만** 사용. 값 추가·변경은 `themes.ts` 에서.
- 레이아웃을 수정하면 **`export-pptx.ts` 의 같은 레이아웃 함수도 함께 수정**해 화면·PPTX 구도를 맞춘다.
- `React.StrictMode` 추가 금지, `ui/`·`miso-sdk/` 수정 금지 (템플릿 관리 영역).
- 데이터와 뷰 분리: 카피·데이터는 `deck-content.ts` 에만.

---

_검증: 실제 코더 템플릿에 오버레이 후 `npm run build`(tsc -b + vite build) 통과, 20장 데모 덱 렌더·PPTX 다운로드 확인 완료._
