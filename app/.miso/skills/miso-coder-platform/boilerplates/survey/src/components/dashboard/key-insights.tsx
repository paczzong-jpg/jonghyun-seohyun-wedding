import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Lightbulb } from "lucide-react"
import type { AggregateStats } from "@/lib/survey-data"
import { generateInsights } from "@/lib/survey-data"

interface KeyInsightsProps {
  stats: AggregateStats
}

/** 집계 결과에서 자동 생성된 주요 인사이트를 표시한다. */
export function KeyInsights({ stats }: KeyInsightsProps) {
  const insights = generateInsights(stats)

  if (insights.length === 0) return null

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Lightbulb className="size-4 text-chart-3" />
          주요 인사이트
        </CardTitle>
        <p className="text-xs text-muted-foreground">응답 데이터에서 자동 추출된 발견사항</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {insights.map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <p className="text-sm text-foreground leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>

        {/* 카테고리별 평균 점수 요약 */}
        {Object.keys(stats.categoryAvg).filter((c) => c !== "기타 의견").length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">카테고리별 평균 점수율</p>
            <div className="space-y-2">
              {Object.entries(stats.categoryAvg)
                .filter(([cat]) => cat !== "기타 의견")
                .sort(([, a], [, b]) => b.avgPct - a.avgPct)
                .map(([cat, val]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-xs text-muted-foreground truncate">
                      {cat}
                    </span>
                    <Progress value={val.avgPct} className="h-2 flex-1" />
                    <span className="w-10 shrink-0 text-right text-xs font-medium text-foreground">
                      {val.avgPct}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
