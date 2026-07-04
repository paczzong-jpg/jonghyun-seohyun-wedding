import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { KeyInsights } from "@/components/dashboard/key-insights"
import { QuestionCharts } from "@/components/dashboard/question-charts"
import { FeedbackList } from "@/components/dashboard/feedback-list"
import {
  QUESTIONS,
  fetchResponses,
  computeAggregateStats,
  exportResponseRows,
  type ResponseRecord,
  type AggregateStats,
} from "@/lib/survey-data"
import { exportToCsv } from "@/lib/excel"

type LoadState = "loading" | "ready" | "error"

/**
 * 응답 결과 대시보드 (/results).
 * - 로딩: Skeleton
 * - 빈 응답: 안내 문구
 * - 데이터 있음: KPI · 인사이트 · 문항별 차트 · 주관식 · CSV export
 *
 * fetchResponses()는 PocketBase 컬렉션이 없으면 MOCK_RESPONSES를 반환해
 * 개발 단계에서도 바로 대시보드를 확인할 수 있다.
 */
export function ResultsPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [responses, setResponses] = useState<ResponseRecord[]>([])
  const [stats, setStats] = useState<AggregateStats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchResponses()
      .then((data) => {
        if (cancelled) return
        setResponses(data)
        setStats(computeAggregateStats(data))
        setLoadState("ready")
      })
      .catch(() => {
        if (!cancelled) setLoadState("error")
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleExport() {
    exportToCsv(exportResponseRows(responses), "survey_responses")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10">

        {/* 헤더 */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">응답 결과 대시보드</h1>
            <p className="mt-1 text-sm text-muted-foreground">디지털 역량 자가진단 응답 집계</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              설문으로 돌아가기
            </a>
            <Button
              variant="outline"
              size="sm"
              disabled={loadState !== "ready" || responses.length === 0}
              onClick={handleExport}
            >
              <Download className="mr-2 size-4" />
              CSV 내보내기
            </Button>
          </div>
        </div>

        {/* 로딩 */}
        {loadState === "loading" && <DashboardSkeleton />}

        {/* 에러 */}
        {loadState === "error" && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-destructive">데이터를 불러오는 중 오류가 발생했습니다.</p>
            <button
              className="mt-3 text-sm text-primary underline-offset-4 hover:underline"
              onClick={() => window.location.reload()}
            >
              새로고침
            </button>
          </div>
        )}

        {/* 빈 상태 */}
        {loadState === "ready" && responses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground">아직 응답 데이터가 없습니다.</p>
            <a
              href="/"
              className="mt-3 text-sm text-primary underline-offset-4 hover:underline"
            >
              설문으로 이동 →
            </a>
          </div>
        )}

        {/* 대시보드 */}
        {loadState === "ready" && stats && responses.length > 0 && (
          <div className="space-y-8">
            {/* KPI 카드 */}
            <KPICards stats={stats} />

            {/* 주요 인사이트 */}
            <KeyInsights stats={stats} />

            {/* 문항별 응답 분포 차트 */}
            <QuestionCharts stats={stats} questions={QUESTIONS} />

            {/* 주관식 응답 목록 */}
            <FeedbackList stats={stats} questions={QUESTIONS} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── 로딩 스켈레톤 ─────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-xl" />
      {/* 인사이트 */}
      <Skeleton className="h-36 rounded-xl" />
      {/* 차트 그리드 */}
      <div>
        <Skeleton className="mb-3 h-5 w-32 rounded" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
      {/* 주관식 */}
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
