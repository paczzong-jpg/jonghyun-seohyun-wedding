import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare } from "lucide-react"
import type { AggregateStats, Question } from "@/lib/survey-data"

interface FeedbackListProps {
  stats: AggregateStats
  questions: Question[]
}

const PAGE_SIZE = 8

/**
 * 주관식(text) 문항의 응답 목록을 표시한다.
 * 텍스트 문항이 없거나 응답이 0건이면 렌더하지 않는다.
 */
export function FeedbackList({ stats, questions }: FeedbackListProps) {
  const [page, setPage] = useState(0)

  const textQuestions = questions.filter((q) => q.type === "text")
  if (textQuestions.length === 0) return null

  // 모든 텍스트 문항의 응답을 합쳐 표시 (여러 개일 경우 질문 라벨 포함)
  const allFeedbacks: { text: string; questionText: string }[] = []
  for (const q of textQuestions) {
    const agg = stats.perQuestion[q.id]
    for (const text of agg?.textAnswers ?? []) {
      allFeedbacks.push({ text, questionText: q.text })
    }
  }

  if (allFeedbacks.length === 0) return null

  const totalPages = Math.max(1, Math.ceil(allFeedbacks.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const paged = allFeedbacks.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <MessageSquare className="size-4 text-primary" />
            주관식 응답
          </CardTitle>
          <Badge variant="secondary">{allFeedbacks.length}건</Badge>
        </div>
        <p className="text-xs text-muted-foreground">응답자가 직접 작성한 의견 목록</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {paged.map((item, i) => (
            <div
              key={currentPage * PAGE_SIZE + i}
              className="rounded-lg border border-border bg-muted/40 px-4 py-3"
            >
              <p className="text-sm leading-relaxed text-foreground">
                &ldquo;{item.text}&rdquo;
              </p>
              {textQuestions.length > 1 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {item.questionText.length > 30
                    ? item.questionText.slice(0, 30) + "…"
                    : item.questionText}
                </p>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 border-t border-border pt-3">
            <button
              onClick={() => setPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-sm text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
