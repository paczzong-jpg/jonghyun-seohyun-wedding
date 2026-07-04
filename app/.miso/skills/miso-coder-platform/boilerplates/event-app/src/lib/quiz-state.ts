import type { QuizAnswer, QuizPlayer } from "@/lib/event-types"

export type QuizPointInput = {
  isCorrect: boolean
  responseMs: number
  timeLimitSec: number
  basePoints: number
  speedBonusPoints: number
}

export type ChoiceStat = {
  choiceId: string
  count: number
  correct: boolean
}

export function calcQuizPoints(input: QuizPointInput): number {
  if (!input.isCorrect) return 0
  const maxMs = Math.max(1, input.timeLimitSec * 1000)
  const elapsedRatio = Math.min(1, Math.max(0, input.responseMs / maxMs))
  const speedBonus = Math.round(input.speedBonusPoints * (1 - elapsedRatio))
  return input.basePoints + speedBonus
}

export function rankQuizPlayers(players: QuizPlayer[]): QuizPlayer[] {
  return [...players]
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      if (a.correctCount !== b.correctCount) return b.correctCount - a.correctCount
      const aAvg = a.answeredCount > 0 ? a.totalResponseMs / a.answeredCount : Number.POSITIVE_INFINITY
      const bAvg = b.answeredCount > 0 ? b.totalResponseMs / b.answeredCount : Number.POSITIVE_INFINITY
      if (aAvg !== bAvg) return aAvg - bAvg
      return (a.lastAnsweredAt ?? "").localeCompare(b.lastAnsweredAt ?? "")
    })
    .map((player, index) => ({ ...player, rank: index + 1 }))
}

export function getChoiceStats(
  answers: QuizAnswer[],
  choiceIds: string[],
  correctChoiceId: string,
): ChoiceStat[] {
  return choiceIds.map((choiceId) => ({
    choiceId,
    correct: choiceId === correctChoiceId,
    count: answers.filter((answer) => answer.choiceId === choiceId).length,
  }))
}

export function getParticipantAnswer(
  answers: QuizAnswer[],
  participantId: string,
  questionId: string,
): QuizAnswer | undefined {
  return answers.find((answer) => answer.participantId === participantId && answer.questionId === questionId)
}
