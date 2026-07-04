# dashboard-app (boilerplate)

운영/모니터링 대시보드용 시작점. **코더 템플릿(Vite + React + react-router-dom + PocketBase + MISO SDK) 위에 얹는 오버레이**다.
52g-studio의 대시보드 앱들을 실측해 공통 골격만 distill했다(특정 앱의 "한 파일 2,000줄" 안티패턴 제거, 재사용 블록으로 분리).

> **시드 없음, PocketBase 연결형 스타터.** 목업 데이터가 없으므로 PocketBase 컬렉션 생성 전까지 카드·차트·테이블은 "데이터 없음" 빈 상태로 표시된다.

> 이 폴더는 **베이스 코더 템플릿을 전제**한다. `src/components/ui/`(shadcn 45종), `src/lib/miso-sdk/`, `src/lib/utils.ts`, 설정파일은 템플릿에 이미 있으므로 여기 중복 포함하지 않는다. 아래 파일을 템플릿의 같은 경로에 덮어/추가하면 된다.

## 들어있는 것 (덮어쓸 위치 = 템플릿 동일 경로)

```
src/App.tsx                        라우터(BrowserRouter+Routes) — 템플릿 스타터 App 대체
src/pages/DashboardPage.tsx        대시보드 페이지(블록 조립)
src/components/dashboard/
  app-shell.tsx                    사이드바 + 탑바 레이아웃 (★ 셸, NavLink 라우팅)
  kpi-cards.tsx                    지표 카드 그리드
  overview-chart.tsx               recharts 영역 차트 (빈 데이터 안전 처리)
  data-table.tsx                   정렬/상태뱃지 테이블 (빈 데이터 안전 처리)
  filter-bar.tsx                   기간/구분 필터
src/lib/dashboard-data.ts          PocketBase 실호출 레이어 (★ COLLECTION 상수 + get* 함수)
```

## 사용법 (코더용)

1. 위 파일들을 템플릿 같은 경로에 배치(`src/App.tsx`는 교체).
2. 플랫폼 preview/dev server를 사용한다. dev 서버는 플랫폼 관리이므로 재시작하지 않는다.
3. **PocketBase 컬렉션 생성**: `$SM_INTERNAL_URL` 내부 API로(브라우저 코드에서 스키마 변경 금지), **API Rules 는 반드시 `""`**.

### 최소 컬렉션 스키마 (`items`)

| 필드명   | 타입   | 설명                               |
|---------|--------|------------------------------------|
| name    | Text   | 항목 이름 (required)               |
| region  | Text   | 지역 구분                          |
| output  | Number | 수치 (0–100)                       |
| status  | Select | 값: `정상`, `점검`, `긴급`         |

PocketBase 기본 필드 `id` · `created` · `updated` 는 자동 생성된다.

4. **COLLECTION 상수 교체**: `src/lib/dashboard-data.ts` 최상단의 `★` 표시 상수를 실제 컬렉션 이름으로 바꾼다.
   ```ts
   // src/lib/dashboard-data.ts
   export const COLLECTION = "items" // ← 실제 컬렉션 이름으로 교체
   ```

5. **KPI · 차트 집계 구현**: `getKpis()` · `getSeries()` · `getCompareSeries()` 함수 안의 주석 예제를 참고해 구현한다. 두 가지 패턴:
   - **패턴 A** (권장): 별도 `dashboard_stats` 컬렉션에 집계값을 저장 후 단순 조회.
   - **패턴 B**: `getFullList` 후 클라이언트 그룹핑 (소규모 데이터).

6. 타입 안전이 필요하면 `.miso/bin/pb-typegen` → `@/types/pb-types` 활용.
7. 로그인 게이트가 필요하면 recipe `pocketbase/auth`를 얹는다.

## 빈 상태 동작

| 컴포넌트      | 빈 데이터 시 동작                          |
|-------------|------------------------------------------|
| KpiCards    | 그리드 자체가 렌더되지 않음 (items=[])    |
| OverviewChart | "데이터 없음" 텍스트 + 260px 빈 카드   |
| DataTable   | 테이블 헤더 유지, 바디에 "데이터 없음" 행 |

## 규칙 (템플릿 규칙 준수)

- shadcn은 `@/components/ui/*`에서 **직접 import** (CLI 설치 금지, ui/ 수정 금지).
- `cn()`은 `@/lib/utils`.
- **시맨틱 토큰만**: `bg-background text-foreground bg-card text-muted-foreground border-border text-primary`. 하드코딩 색상 지양.
- **데이터 레이어 분리**: 모든 pb 호출은 `src/lib/dashboard-data.ts`에만.
- **한 컴포넌트 = 한 책임**: 카드/차트/표/필터를 한 파일에 합치지 말 것.
- `React.StrictMode` 추가 금지(PocketBase auto-cancel 충돌).

---
_검증: 실제 코더 템플릿에 오버레이 후 `npm run build`(tsc -b + vite build) 통과._
