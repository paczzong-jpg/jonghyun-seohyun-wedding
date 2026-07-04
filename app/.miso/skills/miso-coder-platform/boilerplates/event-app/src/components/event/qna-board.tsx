import { useState } from "react"
import { ThumbsUp, CheckCircle2, EyeOff, Pin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { SESSIONS, type Question } from "@/lib/event-data"

type SortMode = "likes" | "latest"

type Props = {
  questions: Question[]
  /** 좋아요 핸들러 — 부모에서 낙관적 업데이트 or pb 호출 */
  onLike: (id: string) => void
  /** 관리자 모드 — true 이면 답변·숨김·핀 토글 버튼 표시 */
  adminMode?: boolean
  onToggleAnswered?: (id: string, current: boolean) => void
  onToggleHidden?: (id: string, current: boolean) => void
  /** 핀 고정 토글 — 핀된 질문은 정렬 최상단 고정 + 발표자 화면 상단 표시. */
  onTogglePin?: (id: string, current: boolean) => void
}

/**
 * Q&A 게시판 — 질문 목록 + 좋아요 + 정렬 토글.
 * - 핀 고정 질문은 정렬 방식과 무관하게 최상단에 위치한다.
 * - 관리자 모드(adminMode=true)에서는 답변/숨김/핀 토글 버튼도 노출된다.
 */
export function QnaBoard({
  questions,
  onLike,
  adminMode = false,
  onToggleAnswered,
  onToggleHidden,
  onTogglePin,
}: Props) {
  const [sort, setSort] = useState<SortMode>("likes")

  const visible = adminMode ? questions : questions.filter((q) => !q.hidden)

  const sorted = [...visible].sort((a, b) => {
    // 핀 고정 질문 최상단
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (sort === "likes") return b.likes - a.likes
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  })

  return (
    <div className="space-y-4">
      {/* 정렬 토글 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {visible.length}개 질문
        </p>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["likes", "latest"] as SortMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSort(mode)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                sort === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode === "likes" ? "좋아요순" : "최신순"}
            </button>
          ))}
        </div>
      </div>

      {/* 질문 목록 */}
      {sorted.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          아직 질문이 없습니다. 첫 번째 질문을 남겨보세요.
        </p>
      ) : (
        sorted.map((q) => {
          const sessionName = q.sessionId
            ? SESSIONS.find((s) => s.id === q.sessionId)?.title
            : undefined

          return (
            <Card
              key={q.id}
              className={cn(
                "shadow-sm transition-opacity",
                q.hidden && "opacity-50",
                q.pinned && "border-primary/40 bg-primary/5",
              )}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* 좋아요 */}
                  <button
                    onClick={() => onLike(q.id)}
                    className="flex shrink-0 flex-col items-center gap-0.5 text-muted-foreground hover:text-primary"
                    aria-label={`좋아요 ${q.likes}`}
                  >
                    <ThumbsUp className="size-4" />
                    <span className="text-xs font-medium tabular-nums">{q.likes}</span>
                  </button>

                  {/* 내용 */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{q.authorName}</span>
                      <span className="text-xs text-muted-foreground">{q.createdAt}</span>

                      {/* 핀 고정 배지 */}
                      {q.pinned && (
                        <Badge variant="outline" className="border-transparent bg-primary/15 text-primary">
                          <Pin className="mr-1 size-3" />
                          고정
                        </Badge>
                      )}

                      {/* 세션 배지 */}
                      {sessionName && (
                        <Badge variant="secondary" className="text-xs">
                          {sessionName}
                        </Badge>
                      )}

                      {/* 답변 완료 배지 */}
                      {q.answered && (
                        <Badge variant="outline" className="border-transparent bg-primary/10 text-primary">
                          <CheckCircle2 className="mr-1 size-3" />
                          답변 완료
                        </Badge>
                      )}

                      {/* 숨김 배지 (관리자만) */}
                      {adminMode && q.hidden && (
                        <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                          <EyeOff className="mr-1 size-3" />
                          숨김
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-foreground/90 leading-relaxed">{q.content}</p>

                    {/* 관리자 액션 */}
                    {adminMode && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onToggleAnswered?.(q.id, q.answered)}
                        >
                          {q.answered ? "답변 취소" : "답변 완료 표시"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onToggleHidden?.(q.id, q.hidden)}
                        >
                          {q.hidden ? "공개" : "숨김"}
                        </Button>
                        <Button
                          variant={q.pinned ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onTogglePin?.(q.id, q.pinned)}
                        >
                          <Pin className="mr-1 size-3" />
                          {q.pinned ? "고정 해제" : "핀 고정"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
