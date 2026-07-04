export type Session = {
  id: string
  title: string
  speaker?: string
  organization?: string
  description: string
  keywords: string[]
  startTime: string
  endTime: string
  color: "blue" | "green" | "orange" | "default"
}

export type Participant = {
  id: string
  name: string
  affiliation: string
  email: string
  phone?: string
  agreed: boolean
  checkedIn: boolean
  checkedInAt?: string
  eventCode: string
  joinCode: string
  createdAt: string
}

export type ParticipantInput = {
  name: string
  affiliation: string
  email: string
  phone?: string
  agreed: boolean
  eventCode?: string
  joinCode?: string
}

export type Question = {
  id: string
  authorName: string
  content: string
  likes: number
  answered: boolean
  hidden: boolean
  pinned: boolean
  sessionId?: string
  eventCode: string
  createdAt: string
}

export type QuestionInput = {
  authorName: string
  content: string
  sessionId?: string
  eventCode?: string
}

export type QuizChoice = {
  id: string
  label: string
}

export type QuizStatus =
  | "draft"
  | "lobby"
  | "question"
  | "locked"
  | "reveal"
  | "leaderboard"
  | "finished"

export type QuizSession = {
  id: string
  eventCode: string
  title: string
  status: QuizStatus
  currentQuestionId?: string
  currentQuestionIndex: number
  questionStartedAt?: string
  questionLockedAt?: string
  showLeaderboard: boolean
  updatedBy?: string
  createdAt: string
}

export type QuizQuestion = {
  id: string
  quizSessionId: string
  order: number
  prompt: string
  choices: QuizChoice[]
  correctChoiceId: string
  timeLimitSec: number
  basePoints: number
  speedBonusPoints: number
  explanation?: string
}

export type QuizPlayer = {
  id: string
  quizSessionId: string
  participantId: string
  displayName: string
  score: number
  rank: number
  correctCount: number
  totalResponseMs: number
  answeredCount: number
  lastAnsweredAt?: string
}

export type QuizAnswer = {
  id: string
  quizSessionId: string
  questionId: string
  participantId: string
  choiceId: string
  isCorrect: boolean
  answeredAt: string
  responseMs: number
  points: number
}

export type DrawPrize = {
  id: string
  eventCode: string
  name: string
  description: string
  quantity: number
  image?: string
  order: number
}

export type DrawWinner = {
  id: string
  eventCode: string
  prizeId: string
  participantId: string
  participantName: string
  drawnAt: string
  voided: boolean
}
