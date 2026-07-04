import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SurveyResult } from "@/lib/survey-data"

interface ResultSummaryProps {
  result: SurveyResult
  onRetry: () => void
}

const LEVEL_META: Record<
  SurveyResult["level"],
  { label: string; description: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  입문: {
    label: "입문",
    description: "기초 역량을 키울 좋은 출발점에 있습니다. 핵심 도구 학습을 시작해 보세요.",
    variant: "secondary",
  },
  초급: {
    label: "초급",
    description: "일부 도구를 활용하고 있습니다. 꾸준한 실습으로 역량을 확장해 보세요.",
    variant: "outline",
  },
  중급: {
    label: "중급",
    description: "다양한 디지털 도구를 능숙하게 활용하고 있습니다. 심화 활용에 도전해 보세요.",
    variant: "default",
  },
  고급: {
    label: "고급",
    description: "디지털 역량이 매우 높습니다. 팀 전파·도구 설계까지 영향력을 넓혀 보세요.",
    variant: "default",
  },
}

/** 설문 채점 결과 요약. 전체 KPI + 카테고리별 진행 바 */
export function ResultSummary({ result, onRetry }: ResultSummaryProps) {
  const meta = LEVEL_META[result.level]

  return (
    <div className="space-y-4">
      {/* ── 전체 점수 KPI 카드 ── */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Badge variant={meta.variant} className="px-3 py-1 text-sm">
            {meta.label} 수준
          </Badge>
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-bold text-foreground">{result.percentage}</span>
            <span className="text-lg text-muted-foreground">%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            총점 {result.totalScore} / {result.maxScore}점
          </p>
          <p className="mt-1 max-w-xs text-sm text-foreground">{meta.description}</p>
        </CardContent>
      </Card>

      {/* ── 카테고리별 KPI 카드 그리드 ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Object.values(result.categoryScores).map((cat) => {
          const pct = cat.max > 0 ? Math.round((cat.score / cat.max) * 100) : 0
          return (
            <Card key={cat.label} className="shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-medium text-foreground">{cat.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-foreground">{pct}%</span>
                  <span className="text-xs text-muted-foreground">
                    {cat.score} / {cat.max}점
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className={cn("text-xs font-medium", categoryColor(pct))}>
                  {categoryLabel(pct)}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── 재시도 버튼 ── */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-border px-5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          다시 응답하기
        </button>
      </div>
    </div>
  )
}

function categoryLabel(pct: number): string {
  if (pct >= 81) return "매우 우수"
  if (pct >= 66) return "우수"
  if (pct >= 41) return "보통"
  return "개선 필요"
}

function categoryColor(pct: number): string {
  if (pct >= 66) return "text-chart-2"
  if (pct >= 41) return "text-primary"
  return "text-destructive"
}
