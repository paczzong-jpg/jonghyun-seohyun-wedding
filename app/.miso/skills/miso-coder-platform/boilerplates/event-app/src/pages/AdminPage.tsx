import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Monitor } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ParticipantTable } from "@/components/event/participant-table"
import { QnaBoard } from "@/components/event/qna-board"
import { JoinQrCard } from "@/components/event/join-qr-card"
import { QuizAdminPanel } from "@/components/event/quiz-admin-panel"
import { DrawAdminPanel } from "@/components/event/draw-admin-panel"
import {
  DEFAULT_EVENT_CODE,
  listParticipants,
  listQuestions,
  likeQuestion,
  toggleAnswered,
  toggleHidden,
  pinQuestion,
  subscribeQuestions,
  type Participant,
  type Question,
} from "@/lib/event-data"

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function AdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([listParticipants(DEFAULT_EVENT_CODE), listQuestions(DEFAULT_EVENT_CODE)])
      .then(([ps, qs]) => {
        if (!active) return
        setParticipants(ps)
        setQuestions(qs)
        setLoading(false)
      })
      .catch((e) => {
        if (!active) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    let unsub: () => void = () => {}
    subscribeQuestions((action, record) => {
      if (!active) return
      setQuestions((prev) => {
        if (action === "delete") return prev.filter((q) => q.id !== record.id)
        const exists = prev.some((q) => q.id === record.id)
        return exists ? prev.map((q) => q.id === record.id ? record : q) : [...prev, record]
      })
    }).then((fn) => { unsub = fn })
    return () => { active = false; unsub() }
  }, [])

  const checkedInCount = participants.filter((p) => p.checkedIn).length
  const answeredCount = questions.filter((q) => q.answered).length
  const pinnedCount = questions.filter((q) => q.pinned).length

  const handleLike = async (id: string) => {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, likes: q.likes + 1 } : q))
    try {
      await likeQuestion(id)
    } catch {
      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, likes: q.likes - 1 } : q))
    }
  }

  const handleToggleAnswered = async (id: string, current: boolean) => {
    const next = !current
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, answered: next } : q))
    try {
      await toggleAnswered(id, next)
    } catch {
      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, answered: current } : q))
    }
  }

  const handleToggleHidden = async (id: string, current: boolean) => {
    const next = !current
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, hidden: next } : q))
    try {
      await toggleHidden(id, next)
    } catch {
      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, hidden: current } : q))
    }
  }

  const handleTogglePin = async (id: string, current: boolean) => {
    const next = !current
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, pinned: next } : q))
    try {
      await pinQuestion(id, next)
    } catch {
      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, pinned: current } : q))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">행사 운영 콘솔</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            체크인, Q&A, 라이브 퀴즈, 경품추첨을 운영합니다.
          </p>
        </div>
        <Link
          to="/presenter"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Monitor className="size-4" />
          발표자 화면
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          데이터를 불러오지 못했습니다: {error}
        </p>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="qna">Q&A</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="draw">Draw</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="참가자" value={participants.length} sub="명 등록" />
              <StatCard label="체크인" value={checkedInCount} sub="명 현장 참여" />
              <StatCard label="질문" value={questions.length} sub="개 접수" />
              <StatCard label="핀 고정" value={pinnedCount} sub={`${answeredCount}개 답변 완료`} />
            </div>
          )}
          <JoinQrCard eventCode={DEFAULT_EVENT_CODE} />
        </TabsContent>

        <TabsContent value="participants" className="mt-5">
          {loading ? <Skeleton className="h-56 w-full rounded-xl" /> : <ParticipantTable rows={participants} />}
        </TabsContent>

        <TabsContent value="qna" className="mt-5">
          {loading ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <QnaBoard
              questions={questions}
              onLike={handleLike}
              adminMode
              onToggleAnswered={handleToggleAnswered}
              onToggleHidden={handleToggleHidden}
              onTogglePin={handleTogglePin}
            />
          )}
        </TabsContent>

        <TabsContent value="quiz" className="mt-5">
          <QuizAdminPanel eventCode={DEFAULT_EVENT_CODE} />
        </TabsContent>

        <TabsContent value="draw" className="mt-5">
          <DrawAdminPanel eventCode={DEFAULT_EVENT_CODE} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
