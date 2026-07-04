import { Card, CardContent } from "@/components/ui/card"
import { Users, TrendingUp, CheckCircle2 } from "lucide-react"
import type { AggregateStats, SurveyResult } from "@/lib/survey-data"

interface KPICardsProps {
  stats: AggregateStats
}

const LEVEL_COLORS: Record<SurveyResult["level"], string> = {
  입문: "text-muted-foreground",
  초급: "text-chart-3",
  중급: "text-primary",
  고급: "text-chart-2",
}

export function KPICards({ stats }: KPICardsProps) {
  const cards = [
    {
      title: "총 응답 수",
      value: `${stats.total}건`,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      sub: "누적 제출 응답",
    },
    {
      title: "평균 점수율",
      value: `${stats.avgPercentage}%`,
      icon: TrendingUp,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
      sub: "전체 응답자 평균",
    },
    {
      title: "전체 완료율",
      value: `${stats.completionRate}%`,
      icon: CheckCircle2,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
      sub: "필수 문항 전부 응답",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="border border-border shadow-sm">
            <CardContent className="px-5 py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold text-card-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.sub}</p>
                </div>
                <div className={`rounded-lg p-2.5 ${card.bg}`}>
                  <card.icon className={`size-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 수준 분포 */}
      {stats.total > 0 && (
        <Card className="border border-border shadow-sm">
          <CardContent className="px-5 py-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">수준별 분포</p>
            <div className="grid grid-cols-4 gap-3">
              {(["입문", "초급", "중급", "고급"] as SurveyResult["level"][]).map((level) => {
                const count = stats.levelDist[level]
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={level} className="text-center">
                    <p className={`text-xl font-bold ${LEVEL_COLORS[level]}`}>{count}명</p>
                    <p className="text-xs text-muted-foreground">{level}</p>
                    <p className="text-xs font-medium text-muted-foreground">{pct}%</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
