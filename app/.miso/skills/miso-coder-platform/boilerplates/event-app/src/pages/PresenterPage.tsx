import { useEffect, useState } from "react"
import type { ComponentType } from "react"
import { Link } from "react-router-dom"
import { MessageCircle, Pin, ThumbsUp, Trophy, Gift } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { JoinQrCard } from "@/components/event/join-qr-card"
import { QuizPresenterPanel } from "@/components/event/quiz-presenter-panel"
import { DrawPresenterPanel } from "@/components/event/draw-presenter-panel"
import {
  DEFAULT_EVENT_CODE,
  SESSIONS,
  listQuestions,
  subscribeQuestions,
  type Question,
} from "@/lib/event-data"
import { cn } from "@/lib/utils"

export type PresenterMode = "qna" | "quiz" | "draw"

type Props = {
  mode?: PresenterMode
}

export function PresenterPage({ mode = "qna" }: Props) {
  return (
    <div className="min-h-screen bg-foreground text-background">
      <header className="sticky top-0 z-40 border-b border-background/15 bg-foreground/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="size-5 rounded bg-primary" />
            <span className="font-bold text-background">MISO Live 2026</span>
            <span className="text-background/40">|</span>
            <span className="text-sm text-background/60">발표자 화면</span>
          </div>
          <div className="flex items-center gap-2">
            <PresenterLink to="/presenter" active={mode === "qna"} icon={MessageCircle} label="Q&A" />
            <PresenterLink to="/presenter/quiz" active={mode === "quiz"} icon={Trophy} label="Quiz" />
            <PresenterLink to="/presenter/draw" active={mode === "draw"} icon={Gift} label="Draw" />
            <Link
              to="/admin"
              className="rounded-md px-3 py-1.5 text-xs text-background/50 transition-colors hover:bg-background/10 hover:text-background"
            >
              관리자
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {mode === "qna" && <QnaPresenter />}
        {mode === "quiz" && <QuizPresenterPanel eventCode={DEFAULT_EVENT_CODE} />}
        {mode === "draw" && <DrawPresenterPanel eventCode={DEFAULT_EVENT_CODE} />}
      </main>
    </div>
  )
}

function PresenterLink({
  to,
  active,
  icon: Icon,
  label,
}: {
  to: string
  active: boolean
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Link to={to}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "text-background/60 hover:bg-background/10 hover:text-background",
          active && "bg-background text-foreground hover:bg-background hover:text-foreground",
        )}
      >
        <Icon className="mr-1.5 size-4" />
        {label}
      </Button>
    </Link>
  )
}

function QnaPresenter() {
  const [questions, setQuestions] = useState<Question[]>([])

  useEffect(() => {
    listQuestions(DEFAULT_EVENT_CODE).then(setQuestions)
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
    return () => {
      active = false
      unsub()
    }
  }, [])

  const visible = questions
    .filter((q) => !q.hidden)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.likes - a.likes
    })
    .slice(0, 8)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold text-background">라이브 Q&A</h1>
          <p className="mt-2 text-background/60">핀 고정 질문과 좋아요가 많은 질문이 먼저 표시됩니다.</p>
        </div>
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-background/15 bg-background/5 px-6 py-16 text-center">
            <MessageCircle className="mx-auto mb-4 size-12 text-background/30" />
            <p className="text-lg text-background/60">아직 질문이 없습니다</p>
          </div>
        ) : (
          visible.map((q, index) => (
            <QuestionCard key={q.id} question={q} rank={index + 1} />
          ))
        )}
      </div>
      <div className="rounded-2xl bg-background p-4 text-foreground">
        <JoinQrCard eventCode={DEFAULT_EVENT_CODE} />
      </div>
    </div>
  )
}

function QuestionCard({ question, rank }: { question: Question; rank: number }) {
  const sessionName = question.sessionId
    ? SESSIONS.find((s) => s.id === question.sessionId)?.title
    : undefined

  return (
    <div className={cn(
      "rounded-xl border p-5",
      question.pinned ? "border-primary/50 bg-primary/10" : "border-background/15 bg-background/5",
    )}>
      <div className="flex gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-sm font-bold text-foreground">
          {rank}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-2xl font-medium leading-relaxed text-background">{question.content}</p>
          <div className="flex flex-wrap items-center gap-2 text-background/60">
            <span>{question.authorName}</span>
            {question.pinned && (
              <Badge className="bg-primary text-primary-foreground">
                <Pin className="mr-1 size-3" />
                고정
              </Badge>
            )}
            {sessionName && <Badge variant="secondary">{sessionName}</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1 text-background/60">
          <ThumbsUp className="size-4" />
          <span className="text-lg font-bold tabular-nums">{question.likes}</span>
        </div>
      </div>
    </div>
  )
}
