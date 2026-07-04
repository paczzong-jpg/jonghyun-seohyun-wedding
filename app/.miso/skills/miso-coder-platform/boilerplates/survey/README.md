# survey (boilerplate)

진단·설문·평가 시작점. **코더 템플릿(Vite + React + react-router-dom + PocketBase + MISO SDK) 위에 얹는 오버레이**다.

단계형 문항 진행(진행 바 + 이전/다음 내비게이션) → 자동 채점 → 개인 결과 요약 흐름에 더해,
**관리자 결과 대시보드**(KPI 카드 · 문항별 차트 · 인사이트 · 주관식 목록 · CSV export)를 포함한다.

> 이 폴더는 **베이스 코더 템플릿을 전제**한다. `src/components/ui/`(shadcn), `src/lib/miso-sdk/`, `src/lib/utils.ts`, 설정 파일은 템플릿에 이미 있으므로 여기에 중복 포함하지 않는다. 아래 파일을 템플릿의 같은 경로에 덮어/추가하면 된다.

## 들어있는 것

    src/App.tsx                                   라우터 (/ 설문, /results 대시보드)
    src/pages/SurveyPage.tsx                      설문 응답 플로우
    src/pages/ResultsPage.tsx                     관리자 결과 대시보드
    src/components/survey/
      question-card.tsx                           단일/다중/척도/주관식 문항 렌더
      progress-bar.tsx                            완료 기반 진행률 표시
      result-summary.tsx                          개인 결과 KPI 카드
    src/components/dashboard/
      kpi-cards.tsx                               총응답·평균점수율·완료율 + 수준 분포
      question-charts.tsx                         문항별 응답 분포 (recharts)
      key-insights.tsx                            자동 인사이트 + 카테고리 평균
      feedback-list.tsx                           주관식 응답 목록 (페이지네이션)
    src/lib/survey-data.ts                        문항·채점·집계·PB 저장·CSV 행 변환
    src/lib/excel.ts                              CSV 내보내기 유틸리티

## 의존 패키지 설치

없음. `recharts`는 베이스 코더 템플릿에 포함되어 있고, export는 브라우저 CSV API만 사용한다.

## 사용법

### 1. 파일 배치

위 파일들을 코더 템플릿의 같은 경로에 배치한다 (`src/App.tsx`는 교체).

### 2. 문항 교체

`src/lib/survey-data.ts`의 `QUESTIONS` 배열을 수정한다.

객관식(단일):

    { id: "q1", text: "질문 내용", type: "single", category: "카테고리명",
      options: [{ id: "q1_a", label: "선택지", score: 3 }, ...] }

다중 선택:

    { id: "q2", text: "모두 선택하세요", type: "multiple", category: "카테고리명",
      options: [{ id: "q2_a", label: "선택지", score: 1 }, ...] }

척도(슬라이더):

    { id: "q3", text: "자기평가", type: "scale", category: "카테고리명",
      scaleMin: 1, scaleMax: 5, scaleMinLabel: "전혀 아님", scaleMaxLabel: "매우 그러함" }

주관식(텍스트, 선택 사항):

    { id: "q4", text: "건의사항을 입력해 주세요.", type: "text",
      category: "기타 의견", optional: true }

### 3. 채점 기준 조정

`calcResult()` 내부 `level` 판정 임계값을 수정한다:

    percentage >= 81 → "고급"
    percentage >= 66 → "중급"
    percentage >= 41 → "초급"
    그 외            → "입문"

### 4. 결과 대시보드 (`/results`)

브라우저에서 `/results`로 이동하면 집계 대시보드가 열린다.

> **응답 시드 없음** — 실제 제출이 쌓이면 결과 대시보드가 채워짐. 스타터.
> 컬렉션 미생성 상태에서 `/results`를 열면 빈 대시보드(0건)가 표시된다.
> 아래 5번 절차로 컬렉션을 생성한 후 설문을 제출하면 데이터가 보인다.

대시보드 구성:
- **KPI 카드**: 총 응답 수 · 평균 점수율 · 완료율 · 수준 분포
- **주요 인사이트**: 지배 수준 · 카테고리 최고/최저 · 척도 평균 · 주관식 참여율 자동 문장화
- **문항별 차트**: 객관식/다중선택 수평 바, 척도 수직 바 + 평균 기준선 (recharts)
- **주관식 응답**: 텍스트 문항 응답 목록, 페이지네이션
- **CSV 내보내기**: 응답별 원본 데이터 + 점수 컬럼 CSV 다운로드

### 5. PocketBase 저장

`submitResponse()`가 `survey_responses` 컬렉션에 자동 저장한다.
컬렉션 생성은 브라우저 코드에서 할 수 없으므로 **내부 API curl**로 실행한다:

    curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_CODEBASE_ID}/data/api/collections \
      -H "Content-Type: application/json" \
      -d '{
        "name":"survey_responses","type":"base",
        "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
        "fields":[
          {"name":"answers","type":"json","required":true},
          {"name":"total_score","type":"number"},
          {"name":"max_score","type":"number"},
          {"name":"percentage","type":"number"},
          {"name":"level","type":"text"},
          {"name":"created","type":"autodate","onCreate":true,"onUpdate":false}
        ]
      }'

API Rules를 `""` 로 명시하지 않으면 `Token required` 에러가 발생한다.

타입 생성:

    .miso/bin/pb-typegen   # → src/types/pb-types.ts

## 규칙 (템플릿 규칙 준수)

- shadcn은 `@/components/ui/*`에서 **직접 import** (CLI 설치 금지, `ui/` 수정 금지).
- `cn()`은 `@/lib/utils`.
- **시맨틱 토큰만**: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `text-primary`. 하드코딩 색상 지양.
- **문항/채점/집계는 `survey-data.ts`로 분리**: 컴포넌트에 문항 데이터·집계 로직 직접 작성 금지.
- `React.StrictMode` 추가 금지 (PocketBase auto-cancel 충돌).
- PocketBase 스키마 변경은 `$SM_INTERNAL_URL` curl로만 (브라우저 코드 금지).

---
_검증: 실제 코더 템플릿에 오버레이 후 `npm run build`(tsc -b + vite build) 통과 전제._
