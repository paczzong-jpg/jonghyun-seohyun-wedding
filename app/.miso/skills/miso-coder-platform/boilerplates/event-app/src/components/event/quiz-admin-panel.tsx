import { useCallback, useEffect, useMemo, useState } from "react"
import { Lock, Play, RotateCcw, Trophy, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
  updateQuizSession,
  type QuizAnswer,
  type QuizPlayer,
  type QuizQuestion,
  type QuizSession,
  type QuizStatus,
} from "@/lib/event-data"

type Props = {
  eventCode?: string
}

export function QuizAdminPanel({ eventCode = DEFAULT_EVENT_CODE }: Props) {
  const [session, setSession] = useState<QuizSession | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [players, setPlayers] = useState<QuizPlayer[]>([])
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [loading, setLoading] = useState(true)

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
    setLoading(false)
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

  const currentAnswers = currentQuestion
    ? answers.filter((answer) => answer.questionId === currentQuestion.id)
    : []

  async function setStatus(next: Partial<Pick<QuizSession, "currentQuestionId" | "currentQuestionIndex" | "showLeaderboard">> & { status?: QuizStatus }) {
    if (!session) return
    const updated = await updateQuizSession(session.id, next)
    setSession(updated)
    await load()
  }

  async function startQuestion(index: number) {
    const question = questions[index]
    if (!question) return
    await setStatus({
      status: "question",
      currentQuestionId: question.id,
      currentQuestionIndex: index,
      showLeaderboard: false,
    })
  }

  if (loading || !session) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="상태" value={session.status} />
        <Stat label="참가자" value={`${players.length}명`} />
        <Stat label="현재 응답" value={`${currentAnswers.length}개`} />
        <Stat label="문제" value={`${session.currentQuestionIndex + 1}/${questions.length}`} />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">진행 제어</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStatus({ status: "lobby", currentQuestionIndex: 0, currentQuestionId: questions[0]?.id, showLeaderboard: false })}>
              <RotateCcw className="mr-2 size-4" />
              로비 열기
            </Button>
            <Button onClick={() => startQuestion(session.currentQuestionIndex)}>
              <Play className="mr-2 size-4" />
              현재 문제 공개
            </Button>
            <Button variant="outline" onClick={() => setStatus({ status: "locked" })}>
              <Lock className="mr-2 size-4" />
              응답 잠금
            </Button>
            <Button variant="outline" onClick={() => setStatus({ status: "reveal" })}>
              <Eye className="mr-2 size-4" />
              정답 공개
            </Button>
            <Button variant="outline" onClick={() => setStatus({ status: "leaderboard", showLeaderboard: true })}>
              <Trophy className="mr-2 size-4" />
              순위표
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const nextIndex = session.currentQuestionIndex + 1
                if (nextIndex >= questions.length) setStatus({ status: "finished", showLeaderboard: true })
                else startQuestion(nextIndex)
              }}
            >
              다음
            </Button>
          </div>

          {currentQuestion && (
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="secondary">Q{session.currentQuestionIndex + 1}</Badge>
                  <p className="mt-2 font-semibold text-foreground">{currentQuestion.prompt}</p>
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">{currentQuestion.timeLimitSec}초</p>
              </div>
              <div className="mt-4">
                <QuizAnswerDistribution question={currentQuestion} answers={currentAnswers} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">리더보드</CardTitle>
        </CardHeader>
        <CardContent>
          <QuizLeaderboard players={players} />
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}
