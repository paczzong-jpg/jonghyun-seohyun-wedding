import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SurveyProgressBar } from "@/components/survey/progress-bar"
import { QuestionCard } from "@/components/survey/question-card"
import { ResultSummary } from "@/components/survey/result-summary"
import {
  QUESTIONS,
  calcResult,
  submitResponse,
  type Answers,
  type AnswerValue,
  type SurveyResult,
  type Question,
} from "@/lib/survey-data"

type Phase = "survey" | "submitting" | "result"

/**
 * 설문 페이지.
 * - survey 단계: 문항 단계 진행 (진행 바 + 이전/다음 내비게이션)
 * - submitting: 제출 중 로딩
 * - result: ResultSummary 인라인 표시
 *
 * 진행률 표시는 "완료된 필수 문항 수 / 전체 필수 문항 수" 기반.
 * optional 문항은 미응답 시에도 다음 이동이 가능하며 채점에서 0점 처리.
 */
export function SurveyPage() {
  const [phase, setPhase] = useState<Phase>("survey")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<SurveyResult | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)

  const total = QUESTIONS.length
  const question = QUESTIONS[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === total - 1
  const currentAnswer = question ? answers[question.id] : undefined
  const hasAnswer = isAnswered(question, currentAnswer)

  // 완료 기반 진행률: 필수 문항 중 응답 완료된 수
  const requiredQuestions = QUESTIONS.filter((q) => !q.optional)
  const answeredCount = requiredQuestions.filter((q) =>
    isAnswered(q, answers[q.id]),
  ).length

  function handleChange(value: AnswerValue) {
    if (!question) return
    setAnswers((prev) => ({ ...prev, [question.id]: value }))
  }

  function handlePrev() {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }

  function handleNext() {
    if (!isLast) {
      setCurrentIndex((i) => i + 1)
    }
  }

  async function handleSubmit() {
    setPhase("submitting")
    const r = calcResult(answers)
    try {
      await submitResponse(r)
    } catch {
      setSaveFailed(true)
    }
    setResult(r)
    setPhase("result")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleRetry() {
    setAnswers({})
    setCurrentIndex(0)
    setResult(null)
    setSaveFailed(false)
    setPhase("survey")
  }

  // ── 결과 화면 ─────────────────────────────────────────────
  if (phase === "result" && result) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-xl px-4 py-10">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-foreground">진단 결과</h1>
            <p className="mt-1 text-sm text-muted-foreground">디지털 역량 자가진단 완료</p>
          </div>
          {saveFailed && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              결과가 저장되지 않았습니다. 네트워크 연결을 확인 후 다시 시도해 주세요.
            </div>
          )}
          <ResultSummary result={result} onRetry={handleRetry} />
        </div>
      </div>
    )
  }

  // ── 설문 화면 ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-10">
        {/* 헤더 */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-foreground">디지털 역량 자가진단</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            총 {total}문항 · 소요시간 약 3분
          </p>
        </div>

        {/* 완료 기반 진행 바 */}
        <div className="mb-6">
          <SurveyProgressBar
            answered={answeredCount}
            total={requiredQuestions.length}
          />
        </div>

        {/* 문항 카드 */}
        {question && (
          <QuestionCard
            question={question}
            index={currentIndex}
            value={currentAnswer}
            onChange={handleChange}
          />
        )}

        {/* 내비게이션 */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={isFirst || phase === "submitting"}
            className="w-24"
          >
            이전
          </Button>

          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {total}
          </span>

          {isLast ? (
            <Button
              onClick={handleSubmit}
              disabled={!hasAnswer || phase === "submitting"}
              className="w-24"
            >
              {phase === "submitting" ? "제출 중…" : "제출"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!hasAnswer}
              className="w-24"
            >
              다음
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 헬퍼 ──────────────────────────────────────────────────

/**
 * 문항에 유효한 답변이 있는지 확인.
 * optional 문항은 항상 true를 반환해 다음 이동을 허용한다.
 */
function isAnswered(question: Question | undefined, value: AnswerValue | undefined): boolean {
  if (!question) return false
  if (question.optional) return true
  if (value === undefined) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "number") return true
  return (value as string).trim() !== ""
}
