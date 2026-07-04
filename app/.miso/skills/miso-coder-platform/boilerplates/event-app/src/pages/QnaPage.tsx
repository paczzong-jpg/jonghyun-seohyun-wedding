import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { QnaBoard } from "@/components/event/qna-board"
import { QnaInput } from "@/components/event/qna-input"
import { cn } from "@/lib/utils"
import {
  SESSIONS,
  listQuestions,
  likeQuestion,
  submitQuestion,
  subscribeQuestions,
  type Question,
  type QuestionInput,
  type Session,
} from "@/lib/event-data"

// ---------------------------------------------------------------------------
// PocketBase 실시간 전환 안내
// ---------------------------------------------------------------------------
// 목업 → 실시간 전환 시 아래 훅을 사용한다:
//   import { useRealtimeCollection } from "@/hooks/use-realtime-collection"
//   const { records, isLoading } = useRealtimeCollection<Question>("questions", {
//     queryParams: { sort: "-created", filter: "hidden=false" },
//   })
// 단, use-realtime-collection 훅은 recipes/pocketbase/realtime 에서 복사해 온다.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 세션 선택 상태
// ---------------------------------------------------------------------------

type ViewState =
  | { mode: "picker" }
  | { mode: "all" }
  | { mode: "session"; session: Session }

// 세션 색상 → semantic Tailwind 클래스 매핑
const SESSION_COLOR: Record<Session["color"], string> = {
  blue: "bg-card border-border hover:border-primary/40",
  green: "bg-secondary border-border hover:border-primary/40",
  orange: "bg-muted border-border hover:border-primary/40",
  default: "bg-card border-border hover:border-primary/40",
}

// ---------------------------------------------------------------------------
// 세션 선택 화면
// ---------------------------------------------------------------------------

function SessionPicker({ onSelect }: { onSelect: (v: ViewState) => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">라이브 Q&A</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          세션을 선택하면 해당 발표에 대한 질문을 보내고 확인할 수 있습니다.
        </p>
      </div>

      {/* 전체 Q&A */}
      <button
        className="w-full rounded-xl border border-border bg-card px-5 py-3.5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent"
        onClick={() => onSelect({ mode: "all" })}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">전체 Q&A</p>
            <p className="text-xs text-muted-foreground">모든 세션의 질문을 한 번에 봅니다</p>
          </div>
        </div>
      </button>

      {/* 세션 선택 그리드 */}
      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">세션 선택</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SESSIONS.map((session) => (
            <button
              key={session.id}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-all",
                SESSION_COLOR[session.color],
              )}
              onClick={() => onSelect({ mode: "session", session })}
            >
              <div className="space-y-2">
                {/* 시간 */}
                <p className="text-xs font-mono text-muted-foreground">
                  {session.startTime} – {session.endTime}
                </p>

                {/* 제목 */}
                <p className="font-semibold text-foreground leading-snug">{session.title}</p>

                {/* 발표자 */}
                {session.speaker && (
                  <p className="text-sm text-muted-foreground">
                    {session.speaker}
                    {session.organization && ` · ${session.organization}`}
                  </p>
                )}

                {/* 키워드 배지 */}
                {session.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {session.keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs px-1.5 py-0">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Q&A 뷰 (세션 선택 후)
// ---------------------------------------------------------------------------

function QnaView({
  view,
  questions,
  onBack,
  onLike,
  onSubmit,
}: {
  view: Exclude<ViewState, { mode: "picker" }>
  questions: Question[]
  onBack: () => void
  onLike: (id: string) => void
  onSubmit: (input: QuestionInput) => Promise<void>
}) {
  const isSessionMode = view.mode === "session"
  const session = isSessionMode ? view.session : null

  const filtered = isSessionMode
    ? questions.filter((q) => q.sessionId === session!.id)
    : questions

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 헤더: 뒤로가기 + 세션 정보 */}
      <div>
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          세션 목록으로
        </button>

        {session ? (
          <div>
            <h1 className="text-2xl font-bold text-foreground">{session.title}</h1>
            {session.speaker && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {session.speaker}
                {session.organization && ` · ${session.organization}`}
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {session.description}
            </p>
            {session.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {session.keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-foreground">전체 Q&A</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              모든 세션의 질문을 확인하고 새 질문을 남길 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* 질문 입력 */}
      <QnaInput
        onSubmit={onSubmit}
        sessionId={session?.id}
        placeholder={
          session
            ? `"${session.title}" 세션에 대해 궁금한 점을 질문하세요.`
            : "발표자에게 궁금한 점을 질문하세요."
        }
      />

      {/* Q&A 보드 */}
      <QnaBoard questions={filtered} onLike={onLike} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 페이지 루트
// ---------------------------------------------------------------------------

/**
 * 라이브 Q&A 페이지.
 * 1단계: 세션 선택 or 전체 Q&A.
 * 2단계: 선택된 세션의 질문 목록 + 입력 폼.
 *
 * 실시간 구독(subscribeQuestions)은 PocketBase questions 컬렉션이 있으면 live 갱신,
 * 없으면(목업 프리뷰) graceful no-op으로 떨어진다.
 */
export function QnaPage() {
  const [view, setView] = useState<ViewState>({ mode: "picker" })
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 초기 로드
  useEffect(() => {
    let active = true
    listQuestions()
      .then((qs) => { if (active) { setQuestions(qs); setIsLoading(false) } })
      .catch((err) => { if (active) { setError(err instanceof Error ? err : new Error(String(err))); setIsLoading(false) } })
    return () => { active = false }
  }, [])

  // 실시간 구독 — 백엔드에 'questions' 컬렉션이 있으면 live 갱신, 목업이면 no-op
  useEffect(() => {
    let active = true
    let unsub: () => void = () => {}
    subscribeQuestions((action, record) => {
      setQuestions((prev) => {
        if (action === "delete") return prev.filter((q) => q.id !== record.id)
        const exists = prev.some((q) => q.id === record.id)
        return exists
          ? prev.map((q) => (q.id === record.id ? record : q))
          : [...prev, record]
      })
    }).then((fn) => { if (active) unsub = fn; else fn() })
    return () => { active = false; unsub() }
  }, [])

  // 낙관적 좋아요 + 실패 시 롤백
  const handleLike = useCallback(async (id: string) => {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, likes: q.likes + 1 } : q))
    try {
      await likeQuestion(id)
    } catch {
      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, likes: q.likes - 1 } : q))
    }
  }, [])

  const handleSubmit = useCallback(async (input: QuestionInput) => {
    const created = await submitQuestion(input)
    setQuestions((prev) => [...prev, created])
  }, [])

  // 로딩 스켈레톤
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // 에러
  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          질문을 불러오는 데 실패했습니다: {error.message}
        </p>
      </div>
    )
  }

  // 세션 선택 화면
  if (view.mode === "picker") {
    return <SessionPicker onSelect={setView} />
  }

  // Q&A 뷰 (전체 or 세션별)
  return (
    <QnaView
      view={view}
      questions={questions}
      onBack={() => setView({ mode: "picker" })}
      onLike={handleLike}
      onSubmit={handleSubmit}
    />
  )
}
