// ★ 문항 정의 · 채점 로직 · PocketBase 저장 · 응답 집계.
// 운영 전환 시 QUESTIONS 배열과 calcResult 임계값만 수정하면 된다.

import pb from "@/lib/miso-sdk/runtime-client"

// ── PocketBase 컬렉션 이름 ★ ──────────────────────────────
export const COLLECTION = "survey_responses"

// ── 타입 ──────────────────────────────────────────────────

export type QuestionType = "single" | "multiple" | "scale" | "text"

export interface QuestionOption {
  id: string
  label: string
  score: number
}

export interface Question {
  id: string
  text: string
  type: QuestionType
  category: string
  optional?: boolean        // true면 미응답 허용 (채점 0점, 다음 이동 블록 안 함)
  // single / multiple
  options?: QuestionOption[]
  // scale
  scaleMin?: number
  scaleMax?: number
  scaleMinLabel?: string
  scaleMaxLabel?: string
}

export type SingleAnswer = string      // option.id
export type MultipleAnswer = string[]  // option.id[]
export type ScaleAnswer = number
export type TextAnswer = string

export type AnswerValue = SingleAnswer | MultipleAnswer | ScaleAnswer

export type Answers = Record<string, AnswerValue>

export interface CategoryScore {
  label: string
  score: number
  max: number
}

export interface SurveyResult {
  answers: Answers
  totalScore: number
  maxScore: number
  percentage: number
  level: "입문" | "초급" | "중급" | "고급"
  categoryScores: Record<string, CategoryScore>
}

// ── 문항 정의 ──────────────────────────────────────────────
// ★ 교체 지점: 아래 QUESTIONS 배열을 프로젝트에 맞게 수정한다.
// 샘플 주제: 디지털 역량 자가진단 (3개 카테고리 × 3문항 + 주관식 1문항 = 10문항)

export const QUESTIONS: Question[] = [
  // ── 카테고리 1: 데이터 활용 ──────────────────────────────
  {
    id: "q1",
    text: "데이터 분석 도구(Excel, SQL, Python 등)를 업무에서 얼마나 자주 활용하나요?",
    type: "single",
    category: "데이터 활용",
    options: [
      { id: "q1_a", label: "거의 사용하지 않음", score: 1 },
      { id: "q1_b", label: "월 1~2회 정도 사용", score: 2 },
      { id: "q1_c", label: "주 1~2회 정기적으로 사용", score: 3 },
      { id: "q1_d", label: "매일 핵심 업무로 활용", score: 4 },
    ],
  },
  {
    id: "q2",
    text: "스프레드시트(Excel/Google Sheets)로 데이터를 정리·시각화하는 능력을 스스로 평가해 주세요.",
    type: "scale",
    category: "데이터 활용",
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "전혀 못함",
    scaleMaxLabel: "매우 능숙",
  },
  {
    id: "q3",
    text: "현재 업무에서 사용 중인 데이터 시각화 도구를 모두 선택해 주세요.",
    type: "multiple",
    category: "데이터 활용",
    options: [
      { id: "q3_a", label: "Excel / Google Sheets 차트", score: 1 },
      { id: "q3_b", label: "Tableau / Power BI", score: 2 },
      { id: "q3_c", label: "Python (matplotlib, Plotly 등)", score: 2 },
      { id: "q3_d", label: "사용 도구 없음", score: 0 },
    ],
  },

  // ── 카테고리 2: AI 도구 활용 ──────────────────────────────
  {
    id: "q4",
    text: "AI 보조 도구(ChatGPT, Copilot, Claude 등)를 업무에 활용하고 있나요?",
    type: "single",
    category: "AI 도구 활용",
    options: [
      { id: "q4_a", label: "전혀 사용하지 않음", score: 0 },
      { id: "q4_b", label: "가끔 개인적으로 사용", score: 2 },
      { id: "q4_c", label: "업무에 정기적으로 활용", score: 3 },
      { id: "q4_d", label: "팀 표준 워크플로에 통합", score: 4 },
    ],
  },
  {
    id: "q5",
    text: "AI가 생성한 결과물을 검토하고 실무에 맞게 수정·활용하는 능력을 평가해 주세요.",
    type: "scale",
    category: "AI 도구 활용",
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "검토 불가",
    scaleMaxLabel: "완전히 활용",
  },
  {
    id: "q6",
    text: "활용해 본 AI 서비스를 모두 선택해 주세요.",
    type: "multiple",
    category: "AI 도구 활용",
    options: [
      { id: "q6_a", label: "ChatGPT / Claude / Gemini (생성 AI)", score: 1 },
      { id: "q6_b", label: "GitHub Copilot / Cursor (코드 보조)", score: 2 },
      { id: "q6_c", label: "이미지 생성 AI (Midjourney, Firefly 등)", score: 1 },
      { id: "q6_d", label: "업무 자동화 AI (Zapier AI, Make 등)", score: 2 },
      { id: "q6_e", label: "사용해 본 적 없음", score: 0 },
    ],
  },

  // ── 카테고리 3: 협업·커뮤니케이션 ────────────────────────
  {
    id: "q7",
    text: "원격·비동기 협업 도구(Notion, Slack, Jira 등)를 얼마나 능숙하게 활용하나요?",
    type: "single",
    category: "협업·커뮤니케이션",
    options: [
      { id: "q7_a", label: "거의 사용하지 않음", score: 1 },
      { id: "q7_b", label: "기본 기능만 사용", score: 2 },
      { id: "q7_c", label: "다양한 기능을 적극 활용", score: 3 },
      { id: "q7_d", label: "팀 도구 설계·운영까지 담당", score: 4 },
    ],
  },
  {
    id: "q8",
    text: "디지털 문서(제안서, 보고서, 위키 등)를 독립적으로 작성하는 능력을 평가해 주세요.",
    type: "scale",
    category: "협업·커뮤니케이션",
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "초안 작성 어려움",
    scaleMaxLabel: "독립적으로 완성",
  },
  {
    id: "q9",
    text: "현재 팀에서 사용 중인 협업 도구를 모두 선택해 주세요.",
    type: "multiple",
    category: "협업·커뮤니케이션",
    options: [
      { id: "q9_a", label: "Notion / Confluence (문서 협업)", score: 1 },
      { id: "q9_b", label: "Slack / Teams (메신저)", score: 1 },
      { id: "q9_c", label: "Jira / Linear / Asana (프로젝트 관리)", score: 2 },
      { id: "q9_d", label: "Figma / Miro (디자인·화이트보드)", score: 1 },
    ],
  },

  // ── 주관식 ────────────────────────────────────────────────
  {
    id: "q10",
    text: "디지털 역량 개발과 관련해 건의사항이나 바라는 점을 자유롭게 작성해 주세요.",
    type: "text",
    category: "기타 의견",
    optional: true,
  },
]

// ── 채점 로직 ──────────────────────────────────────────────

export function scoreQuestion(question: Question, answer: AnswerValue | undefined): number {
  if (answer === undefined) return 0
  if (question.type === "text") return 0
  if (question.type === "scale") {
    return typeof answer === "number" ? answer : 0
  }
  if (question.type === "single") {
    const opt = question.options?.find((o) => o.id === answer)
    return opt?.score ?? 0
  }
  if (question.type === "multiple") {
    const selected = answer as string[]
    return (question.options ?? [])
      .filter((o) => selected.includes(o.id))
      .reduce((sum, o) => sum + o.score, 0)
  }
  return 0
}

export function questionMaxScore(question: Question): number {
  if (question.type === "text") return 0
  if (question.type === "scale") return question.scaleMax ?? 5
  if (question.type === "single") {
    return Math.max(0, ...(question.options ?? []).map((o) => o.score))
  }
  if (question.type === "multiple") {
    return (question.options ?? []).reduce((sum, o) => sum + Math.max(0, o.score), 0)
  }
  return 0
}

/** 전체 채점 결과를 계산한다. answers가 완전하지 않으면 미응답은 0점 처리. */
export function calcResult(answers: Answers): SurveyResult {
  const categories = [...new Set(QUESTIONS.map((q) => q.category))]

  const categoryScores: Record<string, CategoryScore> = {}
  for (const cat of categories) {
    const qs = QUESTIONS.filter((q) => q.category === cat)
    const score = qs.reduce((s, q) => s + scoreQuestion(q, answers[q.id]), 0)
    const max = qs.reduce((s, q) => s + questionMaxScore(q), 0)
    categoryScores[cat] = { label: cat, score, max }
  }

  const totalScore = Object.values(categoryScores).reduce((s, c) => s + c.score, 0)
  const totalMax = Object.values(categoryScores).reduce((s, c) => s + c.max, 0)
  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0

  const level: SurveyResult["level"] =
    percentage >= 81 ? "고급"
    : percentage >= 66 ? "중급"
    : percentage >= 41 ? "초급"
    : "입문"

  return { answers, totalScore, maxScore: totalMax, percentage, level, categoryScores }
}

// ── PocketBase 저장 ────────────────────────────────────────
// ★ 컬렉션 생성 (최초 1회, $SM_INTERNAL_URL 내부 API 사용):
//
// curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_CODEBASE_ID}/data/api/collections \
//   -H "Content-Type: application/json" \
//   -d '{
//     "name":"survey_responses","type":"base",
//     "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
//     "fields":[
//       {"name":"answers","type":"json","required":true},
//       {"name":"total_score","type":"number"},
//       {"name":"max_score","type":"number"},
//       {"name":"percentage","type":"number"},
//       {"name":"level","type":"text"},
//       {"name":"created","type":"autodate","onCreate":true,"onUpdate":false}
//     ]
//   }'
//
// API Rules를 "" 로 명시하지 않으면 Token required 에러 발생.

/** 설문 응답을 PocketBase에 저장한다. 저장 실패 시 에러를 throw한다. */
export async function submitResponse(result: SurveyResult): Promise<string> {
  const record = await pb.collection(COLLECTION).create(
    {
      answers: result.answers,
      total_score: result.totalScore,
      max_score: result.maxScore,
      percentage: result.percentage,
      level: result.level,
    },
    { $autoCancel: false },
  )
  return record.id
}

// ── 응답 레코드 타입 ───────────────────────────────────────

export interface ResponseRecord {
  id: string
  answers: Answers
  total_score: number
  max_score: number
  percentage: number
  level: SurveyResult["level"]
  created: string
}

// ── 집계 타입 ──────────────────────────────────────────────

export interface QuestionAgg {
  questionId: string
  type: QuestionType
  answeredCount: number
  // single / multiple
  optionCounts?: Record<string, number>  // optionId → count
  // scale
  scaleDist?: Record<number, number>     // value → count
  scaleAvg?: number
  // text
  textAnswers?: string[]
}

export interface AggregateStats {
  total: number
  avgPercentage: number       // 평균 점수율 (%)
  completionRate: number      // 필수 문항 전체 완료 비율 (%)
  levelDist: Record<SurveyResult["level"], number>
  categoryAvg: Record<string, { avgPct: number; avgScore: number; avgMax: number }>
  perQuestion: Record<string, QuestionAgg>
}

// ── 집계 로직 ──────────────────────────────────────────────

function isAnswerFilled(_q: Question, val: AnswerValue | undefined): boolean {
  if (val === undefined) return false
  if (Array.isArray(val)) return val.length > 0
  if (typeof val === "number") return true
  return (val as string).trim() !== ""
}

/** 응답 배열에서 집계 통계를 계산한다. 실제 연산, 가짜 없음. */
export function computeAggregateStats(responses: ResponseRecord[]): AggregateStats {
  const total = responses.length

  if (total === 0) {
    return {
      total: 0,
      avgPercentage: 0,
      completionRate: 0,
      levelDist: { 입문: 0, 초급: 0, 중급: 0, 고급: 0 },
      categoryAvg: {},
      perQuestion: {},
    }
  }

  // 평균 점수율
  const avgPercentage = Math.round(
    responses.reduce((s, r) => s + r.percentage, 0) / total,
  )

  // 완료율: 필수 문항 전부 응답한 비율
  const requiredQs = QUESTIONS.filter((q) => !q.optional)
  const completedCount = responses.filter((r) =>
    requiredQs.every((q) => isAnswerFilled(q, r.answers[q.id])),
  ).length
  const completionRate = Math.round((completedCount / total) * 100)

  // 수준 분포
  const levelDist: Record<SurveyResult["level"], number> = { 입문: 0, 초급: 0, 중급: 0, 고급: 0 }
  for (const r of responses) levelDist[r.level]++

  // 문항별 집계
  const perQuestion: Record<string, QuestionAgg> = {}

  for (const q of QUESTIONS) {
    if (q.type === "single" || q.type === "multiple") {
      const optionCounts: Record<string, number> = {}
      for (const opt of q.options ?? []) optionCounts[opt.id] = 0

      let answeredCount = 0
      for (const r of responses) {
        const ans = r.answers[q.id]
        if (q.type === "single") {
          if (typeof ans === "string" && ans !== "") {
            answeredCount++
            optionCounts[ans] = (optionCounts[ans] ?? 0) + 1
          }
        } else {
          if (Array.isArray(ans) && ans.length > 0) {
            answeredCount++
            for (const id of ans) {
              optionCounts[id] = (optionCounts[id] ?? 0) + 1
            }
          }
        }
      }
      perQuestion[q.id] = { questionId: q.id, type: q.type, answeredCount, optionCounts }

    } else if (q.type === "scale") {
      const min = q.scaleMin ?? 1
      const max = q.scaleMax ?? 5
      const scaleDist: Record<number, number> = {}
      for (let v = min; v <= max; v++) scaleDist[v] = 0

      let answeredCount = 0
      let scaleSum = 0
      for (const r of responses) {
        const ans = r.answers[q.id]
        if (typeof ans === "number") {
          answeredCount++
          scaleSum += ans
          scaleDist[ans] = (scaleDist[ans] ?? 0) + 1
        }
      }
      const scaleAvg =
        answeredCount > 0
          ? Math.round((scaleSum / answeredCount) * 10) / 10
          : 0
      perQuestion[q.id] = { questionId: q.id, type: q.type, answeredCount, scaleDist, scaleAvg }

    } else if (q.type === "text") {
      const textAnswers: string[] = []
      let answeredCount = 0
      for (const r of responses) {
        const ans = r.answers[q.id]
        if (typeof ans === "string" && ans.trim() !== "") {
          answeredCount++
          textAnswers.push(ans.trim())
        }
      }
      perQuestion[q.id] = { questionId: q.id, type: q.type, answeredCount, textAnswers }
    }
  }

  // 카테고리별 평균 (응답자별 카테고리 점수율의 평균)
  const categories = [...new Set(QUESTIONS.map((q) => q.category))]
  const categoryAvg: Record<string, { avgPct: number; avgScore: number; avgMax: number }> = {}

  for (const cat of categories) {
    const qs = QUESTIONS.filter((q) => q.category === cat)
    const catMax = qs.reduce((s, q) => s + questionMaxScore(q), 0)

    let totalPct = 0
    let totalScore = 0
    for (const r of responses) {
      const score = qs.reduce((s, q) => s + scoreQuestion(q, r.answers[q.id]), 0)
      totalScore += score
      totalPct += catMax > 0 ? (score / catMax) * 100 : 0
    }
    categoryAvg[cat] = {
      avgPct: Math.round(totalPct / total),
      avgScore: Math.round((totalScore / total) * 10) / 10,
      avgMax: catMax,
    }
  }

  return { total, avgPercentage, completionRate, levelDist, categoryAvg, perQuestion }
}

// ── 자동 인사이트 ──────────────────────────────────────────

/** 집계 결과에서 주요 발견사항 문장 배열을 자동 생성한다. */
export function generateInsights(stats: AggregateStats): string[] {
  if (stats.total === 0) return []

  const insights: string[] = []

  // 1. 지배적 수준
  const topEntry = (Object.entries(stats.levelDist) as [SurveyResult["level"], number][])
    .sort(([, a], [, b]) => b - a)[0]
  if (topEntry) {
    const pct = Math.round((topEntry[1] / stats.total) * 100)
    insights.push(`응답자의 ${pct}%(${topEntry[1]}명)이 "${topEntry[0]}" 수준으로 나타났습니다.`)
  }

  // 2. 카테고리 최고·최저
  const catEntries = Object.entries(stats.categoryAvg)
    .filter(([cat]) => cat !== "기타 의견")
    .sort(([, a], [, b]) => b.avgPct - a.avgPct)
  if (catEntries.length >= 2) {
    const [bestCat, bestVal] = catEntries[0]
    const [worstCat, worstVal] = catEntries[catEntries.length - 1]
    insights.push(
      `카테고리 평균: "${bestCat}" 최고(${bestVal.avgPct}%), "${worstCat}" 최저(${worstVal.avgPct}%).`,
    )
  }

  // 3. 척도 문항 중 가장 높은 평균
  const scaleQs = QUESTIONS.filter((q) => q.type === "scale")
  const scaleRanked = scaleQs
    .map((q) => ({
      text: q.text.length > 22 ? q.text.slice(0, 22) + "…" : q.text,
      avg: stats.perQuestion[q.id]?.scaleAvg ?? 0,
      max: q.scaleMax ?? 5,
    }))
    .sort((a, b) => b.avg / b.max - a.avg / a.max)
  if (scaleRanked.length > 0) {
    const top = scaleRanked[0]
    insights.push(
      `자기평가 중 "${top.text}" 평균 ${top.avg}/${top.max}점으로 가장 높습니다.`,
    )
  }

  // 4. 주관식 참여율
  const textQ = QUESTIONS.find((q) => q.type === "text")
  if (textQ) {
    const count = stats.perQuestion[textQ.id]?.answeredCount ?? 0
    if (count > 0) {
      const rate = Math.round((count / stats.total) * 100)
      insights.push(`응답자 ${rate}%(${count}명)이 자유 의견을 남겼습니다.`)
    }
  }

  return insights
}

// ── 응답 조회 ──────────────────────────────────────────────

/**
 * PocketBase survey_responses 컬렉션에서 전체 응답을 조회한다.
 * 오류 시 에러를 throw한다 (호출부에서 핸들링).
 *
 * ★ 컬렉션 생성 방법은 README 참조.
 */
export async function fetchResponses(): Promise<ResponseRecord[]> {
  const records = await pb
    .collection(COLLECTION)
    .getFullList<{
      id: string
      answers: Answers
      total_score: number
      max_score: number
      percentage: number
      level: SurveyResult["level"]
      created: string
    }>({ sort: "-created", $autoCancel: false })

  return records.map((r) => ({
    id: r.id,
    answers: r.answers,
    total_score: r.total_score,
    max_score: r.max_score,
    percentage: r.percentage,
    level: r.level,
    created: r.created,
  }))
}

// ── CSV export 행 변환 ─────────────────────────────────────

/** 응답 배열을 CSV용 행 배열로 변환한다. */
export function exportResponseRows(responses: ResponseRecord[]): Record<string, unknown>[] {
  return responses.map((r, i) => {
    const row: Record<string, unknown> = {
      번호: i + 1,
      제출일시: r.created.slice(0, 19).replace("T", " "),
      총점: r.total_score,
      만점: r.max_score,
      점수율: `${r.percentage}%`,
      수준: r.level,
    }

    for (const q of QUESTIONS) {
      const colKey = `Q${QUESTIONS.indexOf(q) + 1}_${q.text.slice(0, 14)}`
      const ans = r.answers[q.id]

      if (q.type === "single") {
        const opt = q.options?.find((o) => o.id === ans)
        row[colKey] = opt?.label ?? ""
      } else if (q.type === "multiple") {
        const selected = (ans as string[] | undefined) ?? []
        const labels = (q.options ?? [])
          .filter((o) => selected.includes(o.id))
          .map((o) => o.label)
        row[colKey] = labels.join(" / ")
      } else if (q.type === "scale") {
        row[colKey] = typeof ans === "number" ? ans : ""
      } else if (q.type === "text") {
        row[`Q${QUESTIONS.indexOf(q) + 1}_의견`] = typeof ans === "string" ? ans : ""
      }
    }

    return row
  })
}
