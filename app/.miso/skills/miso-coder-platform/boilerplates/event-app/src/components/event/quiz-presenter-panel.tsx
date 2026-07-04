import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { QuizAnswerDistribution } from "@/components/event/quiz-answer-distribution"
import { QuizLeaderboard } from "@/components/event/quiz-leaderboard"
import {
  DEFAULT_EVENT_CODE,
  getActiveQuizSession,
  listQuizAnswers,
  listQuizPlayers,
  listQuizQuestions,
  subscribeQuizAnswers,
  subscribeQuizPlayers,
  subscribeQuizSession,
  type QuizAnswer,
  type QuizPlayer,
  type QuizQuestion,
  type QuizSession,
} from "@/lib/event-data"

type Props = {
  eventCode?: string
}

export function QuizPresenterPanel({ eventCode = DEFAULT_EVENT_CODE }: Props) {
  const [session, setSession] = useState<QuizSession | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [players, setPlayers] = useState<QuizPlayer[]>([])
  const [answers, setAnswers] = useState<QuizAnswer[]>([])

  const load = useCallback(async () => {
    const active = await getActiveQuizSession(eventCode)
    const [qs, ps, ans] = await Promise.all([
      listQuizQuestions(active.id),
      listQuizPlayers(active.id),
      listQuizAnswers(active.id),
    ])
    setSession(active)
    setQuestions(qs)
    setPlayers(ps)
    setAnswers(ans)
  }, [eventCode])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let active = true
    const unsubs: Array<() => void> = []
    subscribeQuizSession((_, record) => { if (active) setSession(record) }).then((fn) => unsubs.push(fn))
    subscribeQuizPlayers((_, record) => {
      if (!active) return
      setPlayers((prev) => {
        const exists = prev.some((p) => p.id === record.id)
        return exists ? prev.map((p) => p.id === record.id ? record : p) : [...prev, record]
      })
    }).then((fn) => unsubs.push(fn))
    subscribeQuizAnswers((_, record) => {
      if (!active) return
      setAnswers((prev) => {
        const exists = prev.some((a) => a.id === record.id)
        return exists ? prev.map((a) => a.id === record.id ? record : a) : [...prev, record]
      })
    }).then((fn) => unsubs.push(fn))
    return () => {
      active = false
      unsubs.forEach((fn) => fn())
    }
  }, [])

  const currentQuestion = useMemo(() => {
    if (!session) return questions[0]
    return questions.find((q) => q.id === session.currentQuestionId) ?? questions[session.currentQuestionIndex] ?? questions[0]
  }, [questions, session])
  const currentAnswers = currentQuestion ? answers.filter((a) => a.questionId === currentQuestion.id) : []

  if (!session || !currentQuestion) {
    return <EmptyPresenter title="퀴즈 준비 중" sub="운영자 화면에서 퀴즈 로비를 열어주세요." />
  }

  if (session.status === "lobby") {
    return <EmptyPresenter title={session.title} sub={`참가자 ${players.length}명이 입장했습니다.`} />
  }

  if (session.status === "leaderboard" || session.status === "finished") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <Trophy className="mx-auto mb-4 size-12 text-primary" />
          <h1 className="text-4xl font-bold text-background">리더보드</h1>
          <p className="mt-2 text-background/60">{session.status === "finished" ? "최종 순위" : "현재 순위"}</p>
        </div>
        <div className="rounded-2xl bg-background p-4 text-foreground">
          <QuizLeaderboard players={players} />
        </div>
      </div>
    )
  }

  const showAnswer = session.status === "reveal"

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Badge className="bg-background text-foreground">Q{session.currentQuestionIndex + 1}</Badge>
        <div className="flex items-center gap-2 text-background/70">
          <Clock className="size-5" />
          {currentQuestion.timeLimitSec}초
        </div>
      </div>

      <div>
        <h1 className="text-4xl font-bold leading-tight text-background">{currentQuestion.prompt}</h1>
        <p className="mt-3 text-background/60">응답 {currentAnswers.length}개 · 참가자 {players.length}명</p>
      </div>

      {session.status === "question" && <Progress value={100} className="h-3" />}

      <div className="grid gap-3 md:grid-cols-2">
        {currentQuestion.choices.map((choice) => (
          <div
            key={choice.id}
            className="rounded-xl border border-background/20 bg-background/10 px-5 py-4 text-background"
          >
            <p className="text-xl font-semibold">{choice.label}</p>
            {showAnswer && choice.id === currentQuestion.correctChoiceId && (
              <p className="mt-2 text-sm text-primary">정답</p>
            )}
          </div>
        ))}
      </div>

      {(session.status === "locked" || showAnswer) && (
        <div className="rounded-2xl bg-background p-5 text-foreground">
          <QuizAnswerDistribution question={currentQuestion} answers={currentAnswers} />
        </div>
      )}
    </div>
  )
}

function EmptyPresenter({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Trophy className="mb-5 size-14 text-primary" />
      <h1 className="text-4xl font-bold text-background">{title}</h1>
      <p className="mt-3 text-lg text-background/60">{sub}</p>
    </div>
  )
}
