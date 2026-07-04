import { Progress } from "@/components/ui/progress"

interface SurveyProgressBarProps {
  answered: number  // 완료된 필수 문항 수
  total: number     // 전체 필수 문항 수
}

/**
 * 설문 상단 진행률 표시.
 * 완료 기반(answered/total)으로 계산해 이미 답한 문항 수를 반영한다.
 */
export function SurveyProgressBar({ answered, total }: SurveyProgressBarProps) {
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>완료된 문항</span>
        <span>
          {answered} / {total} 문항 ({percentage}%)
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  )
}
