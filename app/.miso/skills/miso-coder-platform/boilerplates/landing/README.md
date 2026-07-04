# landing (boilerplate)

제품·행사·프로그램 랜딩 및 신청 페이지용 template-grade 시작점.
**Vite + React + react-router-dom + shadcn/ui** 위에 얹는 오버레이다.

> 이 폴더는 **베이스 코더 템플릿을 전제**한다. `src/components/ui/`(shadcn), `src/lib/utils.ts`, 설정파일은 템플릿에 이미 있으므로 여기 중복 포함하지 않는다.

---

## 파일 구성

```
src/App.tsx                                    BrowserRouter + Routes (catch-all 포함) — 템플릿 App 대체
src/pages/LandingPage.tsx                      섹션 조립 페이지
src/lib/landing-content.ts                     ★ 교체 지점 — 모든 카피·섹션 데이터·URL
src/components/landing/
  site-header.tsx                              sticky 상단 네비 + 모바일 햄버거 메뉴
  hero-section.tsx                             배지 + 헤드라인 + 서브 + CTA 2개 + stats + 스크롤 화살표
  pain-points-section.tsx                      고민/문제 인식 그리드 (2×2)
  feature-grid.tsx         → ValueGrid         기대효과·가치 카드 그리드 (번호 + 아이콘)
  curriculum-section.tsx                       단계별 커리큘럼 (Step 카드 + 아이템 그리드)
  schedule-section.tsx                         일정 타임라인 (데스크탑 수평 / 모바일 수직)
  faq-section.tsx                              FAQ 아코디언 (shadcn Accordion)
  cta-section.tsx                              최종 신청 CTA (시맨틱 토큰 배경)
  site-footer.tsx                              브랜드 + 링크 + 저작권 (데드링크 없음)
```

---

## ★ 필수 교체 — 배포 전 반드시 확인

> **`src/lib/landing-content.ts` 의 아래 항목은 더미값입니다. 배포 전 반드시 교체하세요.**

| 변수 | 현재 더미값 | 교체 대상 |
|------|------------|---------|
| `navContent.brand` | `"프로그램명"` | 실제 브랜드·프로그램명 |
| `navContent.ctaHref` | `https://forms.typeform.com/to/YOUR_FORM_ID` | 실제 신청 폼 URL |
| `heroContent.primaryCtaUrl` | `https://forms.typeform.com/to/YOUR_FORM_ID` | 실제 신청 폼 URL |
| `heroContent.headline` | `"일하는 방식을 바꾸는\n5주 실전 프로그램"` | 프로그램 핵심 메시지 |
| `heroContent.badge` | `"2026년 상반기 모집 중"` | 실제 모집 시즌 |
| `heroContent.stats` | 5주 / 주 1회 / 1일 | 실제 과정 스펙 |
| `scheduleContent.phases[*].date` | `"★ 교체: ..."` | 실제 날짜 |
| `ctaContent.formUrl` | `https://forms.typeform.com/to/YOUR_FORM_ID` | 실제 신청 폼 URL |
| `footerContent.brand` | `"브랜드명"` | 실제 브랜드명 |
| `footerContent.links` | `https://example.com/...` | 실제 개인정보처리방침·이용약관 URL |

---

## 섹션별 커스터마이징

### 네비게이션 (`navContent`)

앵커 링크 목록을 수정하면 헤더 메뉴와 모바일 메뉴가 동시에 업데이트된다.

```ts
items: [
  { label: "고민",   href: "#pain-points" },
  { label: "커리큘럼", href: "#curriculum" },
  // 섹션 id 와 href 를 맞춰야 앵커 스크롤이 동작함
],
```

### 히어로 (`heroContent`)

- `headline`: `\n` 으로 줄바꿈 가능 (whitespace-pre-line 처리)
- `stats`: 배열 원소 수에 따라 자동 레이아웃 (구분선 자동 삽입)
- `secondaryCtaAnchor`: 페이지 내 앵커 (`#curriculum` 등)

### 커리큘럼 (`curriculumContent.steps`)

각 step 의 `accentTone` 을 `primary`, `secondary`, `accent`, `muted`, `destructive` 중 하나로 바꾸면 배지·헤더 배경·아이템 레이블 색이 한꺼번에 바뀐다.
아이템이 3개이면 자동으로 3열 그리드, 그 외에는 2열 그리드.

```ts
{ badge: "Step 1", accentTone: "primary", items: [...] }
```

### 일정 (`scheduleContent.phases`)

`date` 필드에 실제 날짜 문자열을 입력한다. 페이즈 수를 늘리거나 줄이면 타임라인이 자동 조정된다.

### FAQ (`faqContent.items`)

shadcn `Accordion` (single, collapsible) 사용. 질문·답변 배열만 수정하면 된다.

### 신청 CTA

`ctaContent.formUrl` 에 Typeform / 네이버폼 / 구글폼 URL 을 입력하면 버튼이 외부 탭으로 열린다.

### 푸터 링크

`footerContent.links` 는 반드시 `http://`, `https://`, `mailto:`, 또는 `#section-id` 형태의 href 를 사용해야 한다. bare `#` 금지.

---

## 사용법

### 1. 파일 배치

위 파일들을 코더 템플릿의 동일 경로에 배치한다(`src/App.tsx` 는 기존 파일 교체).

### 2. 콘텐츠 교체

**`src/lib/landing-content.ts` 만 수정하면** 모든 카피가 바뀐다.
`★ 교체` 주석이 붙은 항목을 우선 교체한다.

### 3. 섹션 추가/제거

`src/pages/LandingPage.tsx` 에서 컴포넌트를 주석처리하거나 순서를 변경한다.

### 4. 아이콘 교체

`src/lib/landing-content.ts` 상단 `lucide-react` import 에서 원하는 아이콘으로 교체한다.

```ts
// 예: Cog → Settings2
import { Settings2, ... } from "lucide-react";
painPointsContent.items[0].icon = Settings2;
```

### 5. 히어로/CTA 배경 교체

- 실제 브랜드·행사·제품 랜딩이면 첫 화면에 관련 이미지 또는 제품/장소/행사 실물을 배치한다.
- 이 보일러플레이트는 generic 시작점이므로 `bg-foreground text-background` 시맨틱 토큰 배경만 둔다.
- 섹션 배경: `bg-background` ↔ `bg-card` ↔ `bg-muted/40` 조합으로 교체

---

## 규칙 (템플릿 규칙 준수)

- shadcn 은 `@/components/ui/*` 에서 **직접 import** (CLI 설치 금지, `ui/` 수정 금지).
- `cn()` 은 `@/lib/utils`.
- **시맨틱 토큰만 사용**: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `primary`, `secondary`, `accent`, `destructive`.
- `dark:` prefix, inline style, hardcoded hex, decorative gradient/orb 사용 금지.
- **데이터와 뷰 분리**: 카피·URL 은 `src/lib/landing-content.ts` 에만.
- **한 컴포넌트 = 한 섹션 책임**.
- `React.StrictMode` 추가 금지 (PocketBase auto-cancel 충돌).
- `ui/` · `miso-sdk/` 포함 금지 (템플릿 관리 영역).

---

_검증: 실제 코더 템플릿에 오버레이 후 `npm run build`(tsc -b + vite build) 통과 확인 필요._
