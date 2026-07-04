import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { QuizLeaderboard } from "@/components/event/quiz-leaderboard"
import {
  DEFAULT_EVENT_CODE,
  ensureQuizPlayer,
  getActiveQuizSession,
  listQuizAnswers,
  listQuizPlayers,
  listQuizQuestions,
  submitQuizAnswer,
  subscribeQuizAnswers,
  subscribeQuizPlayers,
  subscribeQuizSession,
  type Participant,
  type QuizAnswer,
  type QuizPlayer,
  type QuizQuestion,
  type QuizSession,
} from "@/lib/event-data"
import { getParticipantAnswer } from "@/lib/quiz-state"
import { cn } from "@/lib/utils"

type Props = {
  participant: Participant
  eventCode?: string
}

export function QuizParticipantPanel({ participant, eventCode = DEFAULT_EVENT_CODE }: Props) {
  const [session, setSession] = useState<QuizSession | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [players, setPlayers] = useState<QuizPlayer[]>([])
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    const active = await getActiveQuizSession(eventCode)
    const [qs, ans] = await Promise.all([
      listQuizQuestions(active.id),
      listQuizAnswers(active.id),
    ])
    await ensureQuizPlayer(active, participant)
    const ps = await listQuizPlayers(active.id)
    setSession(active)
    setQuestions(qs)
    setPlayers(ps)
    setAnswers(ans)
  }, [eventCode, participant])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [])

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

  const currentAnswer = currentQuestion
    ? getParticipantAnswer(answers, participant.id, currentQuestion.id)
    : undefined
  const player = players.find((p) => p.participantId === participant.id)
  const leaderboard = players
  const remaining = getRemainingPercent(session, currentQuestion, now)

  async function answer(choiceId: string) {
    if (!session || !currentQuestion || currentAnswer) return
    setSubmitting(choiceId)
    try {
      const created = await submitQuizAnswer(session, currentQuestion, participant, choiceId)
      setAnswers((prev) => [...prev, created])
      await load()
    } finally {
      setSubmitting(null)
    }
  }

  if (!session || !currentQuestion) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          퀴즈를 불러오는 중입니다.
        </CardContent>
      </Card>
    )
  }

  const showAnswer = session.status === "reveal" || session.status === "leaderboard" || session.status === "finished"

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{session.title}</CardTitle>
            <Badge variant="secondary">{session.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {session.status === "lobby" && (
            <div className="rounded-lg bg-muted px-4 py-8 text-center">
              <Trophy className="mx-auto mb-3 size-8 text-primary" />
              <p className="font-semibold text-foreground">곧 퀴즈가 시작됩니다</p>
              <p className="mt-1 text-sm text-muted-foreground">진행자가 문제를 공개하면 자동으로 화면이 바뀝니다.</p>
            </div>
          )}

          {session.status !== "lobby" && (
            <>
              <div>
                <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Q{session.currentQuestionIndex + 1} / {questions.length}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" />
                    {currentQuestion.timeLimitSec}초
                  </span>
                </div>
                {session.status === "question" && <Progress value={remaining} className="h-2" />}
              </div>

              <div>
                <p className="text-lg font-semibold leading-snug text-foreground">{currentQuestion.prompt}</p>
                <div className="mt-4 grid gap-2">
                  {currentQuestion.choices.map((choice) => {
                    const selected = currentAnswer?.choiceId === choice.id
                    const correct = choice.id === currentQuestion.correctChoiceId
                    return (
                      <Button
                        key={choice.id}
                        variant="outline"
                        className={cn(
                          "h-auto justify-start px-4 py-3 text-left font-normal",
                          selected && "border-primary bg-primary/10",
                          showAnswer && correct && "border-primary bg-primary/15 text-primary",
                        )}
                        disabled={session.status !== "question" || Boolean(currentAnswer) || submitting !== null}
                        onClick={() => answer(choice.id)}
                      >
                        <span className="mr-3 flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                          {choice.id.toUpperCase()}
                        </span>
                        <span>{choice.label}</span>
                        {showAnswer && correct && <CheckCircle2 className="ml-auto size-4" />}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {currentAnswer && (
                <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">
                    {currentAnswer.isCorrect ? "정답입니다" : "아쉽지만 오답입니다"} · {currentAnswer.points}점
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    현재 누적 {player?.score ?? 0}점 · 순위 {player?.rank ?? "-"}위
                  </p>
                </div>
              )}

              {showAnswer && currentQuestion.explanation && (
                <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
                  {currentQuestion.explanation}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {(session.status === "leaderboard" || session.status === "finished") && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">현재 순위</CardTitle>
          </CardHeader>
          <CardContent>
            <QuizLeaderboard players={leaderboard} currentParticipantId={participant.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function getRemainingPercent(
  session: QuizSession | null,
  question: QuizQuestion | undefined,
  now: number,
): number {
  if (!session?.questionStartedAt || !question) return 100
  const started = new Date(session.questionStartedAt).getTime()
  const elapsed = now - started
  const total = Math.max(1, question.timeLimitSec * 1000)
  return Math.max(0, Math.min(100, 100 - (elapsed / total) * 100))
}
