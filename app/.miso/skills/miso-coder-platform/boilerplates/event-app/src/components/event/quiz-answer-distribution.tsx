import { Progress } from "@/components/ui/progress"
import type { QuizAnswer, QuizQuestion } from "@/lib/event-data"
import { getChoiceStats } from "@/lib/quiz-state"
import { cn } from "@/lib/utils"

type Props = {
  question: QuizQuestion
  answers: QuizAnswer[]
}

export function QuizAnswerDistribution({ question, answers }: Props) {
  const stats = getChoiceStats(
    answers,
    question.choices.map((choice) => choice.id),
    question.correctChoiceId,
  )
  const total = Math.max(1, answers.length)

  return (
    <div className="space-y-3">
      {question.choices.map((choice) => {
        const stat = stats.find((item) => item.choiceId === choice.id)
        const count = stat?.count ?? 0
        const percent = Math.round((count / total) * 100)
        return (
          <div key={choice.id} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className={cn("font-medium", stat?.correct ? "text-primary" : "text-foreground")}>
                {choice.label}
              </p>
              <p className="tabular-nums text-muted-foreground">{count}명</p>
            </div>
            <Progress value={percent} className="h-2" />
          </div>
        )
      })}
    </div>
  )
}
