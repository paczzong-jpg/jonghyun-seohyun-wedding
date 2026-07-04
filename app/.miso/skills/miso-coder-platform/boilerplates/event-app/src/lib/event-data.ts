import pb from "@/lib/miso-sdk/runtime-client"
import { DEFAULT_EVENT_CODE } from "@/lib/event-constants"
import { calcQuizPoints, rankQuizPlayers } from "@/lib/quiz-state"
import { getEligibleDrawCandidates, pickDrawWinner } from "@/lib/draw-state"
import {
  SESSIONS,
  fallbackParticipants,
  fallbackQuestions,
  fallbackQuizSession,
  fallbackQuizQuestions,
  fallbackQuizPlayers,
  fallbackQuizAnswers,
  fallbackPrizes,
  fallbackWinners,
} from "@/lib/event-seed-data"
import type {
  DrawPrize,
  DrawWinner,
  Participant,
  ParticipantInput,
  Question,
  QuestionInput,
  QuizAnswer,
  QuizChoice,
  QuizPlayer,
  QuizQuestion,
  QuizSession,
  QuizStatus,
  Session,
} from "@/lib/event-types"

// ★ Event app data access. PocketBase is the primary runtime.
// If collections are not created yet, the boilerplate falls back to in-memory
// demo data so the app still opens and the interaction model is visible.

export { DEFAULT_EVENT_CODE, SESSIONS }
export type {
  DrawPrize,
  DrawWinner,
  Participant,
  ParticipantInput,
  Question,
  QuestionInput,
  QuizAnswer,
  QuizChoice,
  QuizPlayer,
  QuizQuestion,
  QuizSession,
  QuizStatus,
  Session,
}

const COL = {
  PARTICIPANTS: "participants",
  QUESTIONS: "questions",
  QUIZ_SESSIONS: "quiz_sessions",
  QUIZ_QUESTIONS: "quiz_questions",
  QUIZ_PLAYERS: "quiz_players",
  QUIZ_ANSWERS: "quiz_answers",
  DRAW_PRIZES: "draw_prizes",
  DRAW_WINNERS: "draw_winners",
} as const

type PBRecord = Record<string, unknown> & {
  id: string
  created?: string
  updated?: string
}

type QuizSessionPatch = Partial<
  Pick<
    QuizSession,
    "status" | "currentQuestionId" | "currentQuestionIndex" | "showLeaderboard"
  >
>

function nowIso(): string {
  return new Date().toISOString()
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback
}

function arr<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback
}

export function nowFormatted(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

function mapParticipant(record: unknown): Participant {
  const r = record as unknown as PBRecord
  return {
    id: r.id,
    name: str(r.name),
    affiliation: str(r.affiliation),
    email: str(r.email),
    phone: str(r.phone),
    agreed: bool(r.agreed),
    checkedIn: bool(r.checkedIn),
    checkedInAt: str(r.checkedInAt) || undefined,
    eventCode: str(r.eventCode, DEFAULT_EVENT_CODE),
    joinCode: str(r.joinCode, str(r.eventCode, DEFAULT_EVENT_CODE)),
    createdAt: str(r.created, str(r.createdAt, nowIso())),
  }
}

function mapQuestion(record: unknown): Question {
  const r = record as unknown as PBRecord
  return {
    id: r.id,
    authorName: str(r.authorName, "익명"),
    content: str(r.content),
    likes: num(r.likes),
    answered: bool(r.answered),
    hidden: bool(r.hidden),
    pinned: bool(r.pinned),
    sessionId: str(r.sessionId) || undefined,
    eventCode: str(r.eventCode, DEFAULT_EVENT_CODE),
    createdAt: str(r.created, str(r.createdAt, nowIso())),
  }
}

function mapQuizSession(record: unknown): QuizSession {
  const r = record as unknown as PBRecord
  return {
    id: r.id,
    eventCode: str(r.eventCode, DEFAULT_EVENT_CODE),
    title: str(r.title, "라이브 퀴즈"),
    status: str(r.status, "lobby") as QuizStatus,
    currentQuestionId: str(r.currentQuestionId) || undefined,
    currentQuestionIndex: num(r.currentQuestionIndex),
    questionStartedAt: str(r.questionStartedAt) || undefined,
    questionLockedAt: str(r.questionLockedAt) || undefined,
    showLeaderboard: bool(r.showLeaderboard),
    updatedBy: str(r.updatedBy) || undefined,
    createdAt: str(r.created, str(r.createdAt, nowIso())),
  }
}

function mapQuizQuestion(record: unknown): QuizQuestion {
  const r = record as unknown as PBRecord
  return {
    id: r.id,
    quizSessionId: str(r.quizSessionId, "quiz_main"),
    order: num(r.order),
    prompt: str(r.prompt),
    choices: arr<QuizChoice>(r.choices, []),
    correctChoiceId: str(r.correctChoiceId),
    timeLimitSec: num(r.timeLimitSec, 20),
    basePoints: num(r.basePoints, 1000),
    speedBonusPoints: num(r.speedBonusPoints, 500),
    explanation: str(r.explanation) || undefined,
  }
}

function mapQuizPlayer(record: unknown): QuizPlayer {
  const r = record as unknown as PBRecord
  return {
    id: r.id,
    quizSessionId: str(r.quizSessionId, "quiz_main"),
    participantId: str(r.participantId),
    displayName: str(r.displayName, "참가자"),
    score: num(r.score),
    rank: num(r.rank),
    correctCount: num(r.correctCount),
    totalResponseMs: num(r.totalResponseMs),
    answeredCount: num(r.answeredCount),
    lastAnsweredAt: str(r.lastAnsweredAt) || undefined,
  }
}

function mapQuizAnswer(record: unknown): QuizAnswer {
  const r = record as unknown as PBRecord
  return {
    id: r.id,
    quizSessionId: str(r.quizSessionId, "quiz_main"),
    questionId: str(r.questionId),
    participantId: str(r.participantId),
    choiceId: str(r.choiceId),
    isCorrect: bool(r.isCorrect),
    answeredAt: str(r.answeredAt, str(r.created, nowIso())),
    responseMs: num(r.responseMs),
    points: num(r.points),
  }
}

function mapPrize(record: unknown): DrawPrize {
  const r = record as unknown as PBRecord
  return {
    id: r.id,
    eventCode: str(r.eventCode, DEFAULT_EVENT_CODE),
    name: str(r.name),
    description: str(r.description),
    quantity: num(r.quantity, 1),
    image: str(r.image) || undefined,
    order: num(r.order),
  }
}

function mapWinner(record: unknown): DrawWinner {
  const r = record as unknown as PBRecord
  return {
    id: r.id,
    eventCode: str(r.eventCode, DEFAULT_EVENT_CODE),
    prizeId: str(r.prizeId),
    participantId: str(r.participantId),
    participantName: str(r.participantName),
    drawnAt: str(r.drawnAt, str(r.created, nowIso())),
    voided: bool(r.voided),
  }
}

export async function listSessions(): Promise<Session[]> {
  return [...SESSIONS]
}

export async function listParticipants(eventCode = DEFAULT_EVENT_CODE): Promise<Participant[]> {
  try {
    const rs = await pb.collection(COL.PARTICIPANTS).getFullList({
      sort: "-created",
      filter: `eventCode="${eventCode}"`,
      $autoCancel: false,
    })
    return rs.map(mapParticipant)
  } catch {
    return fallbackParticipants.filter((p) => p.eventCode === eventCode)
  }
}

export async function registerParticipant(input: ParticipantInput): Promise<Participant> {
  const eventCode = input.eventCode ?? DEFAULT_EVENT_CODE
  const data = {
    ...input,
    eventCode,
    joinCode: input.joinCode ?? eventCode,
    checkedIn: false,
  }
  try {
    return mapParticipant(await pb.collection(COL.PARTICIPANTS).create(data, { $autoCancel: false }))
  } catch {
    const created = mapParticipant({ id: uid("p"), ...data, created: nowIso() })
    fallbackParticipants.unshift(created)
    return created
  }
}

export async function checkInParticipant(input: ParticipantInput): Promise<Participant> {
  const eventCode = input.eventCode ?? DEFAULT_EVENT_CODE
  const checkedInAt = nowIso()
  const data = {
    ...input,
    eventCode,
    joinCode: input.joinCode ?? eventCode,
    checkedIn: true,
    checkedInAt,
  }
  try {
    return mapParticipant(await pb.collection(COL.PARTICIPANTS).create(data, { $autoCancel: false }))
  } catch {
    const created = mapParticipant({ id: uid("p"), ...data, created: checkedInAt })
    fallbackParticipants.unshift(created)
    return created
  }
}

export async function updateParticipantCheckIn(id: string, checkedIn: boolean): Promise<void> {
  try {
    await pb.collection(COL.PARTICIPANTS).update(
      id,
      { checkedIn, checkedInAt: checkedIn ? nowIso() : "" },
      { $autoCancel: false },
    )
  } catch {
    const participant = fallbackParticipants.find((p) => p.id === id)
    if (participant) {
      participant.checkedIn = checkedIn
      participant.checkedInAt = checkedIn ? nowIso() : undefined
    }
  }
}

export async function listQuestions(eventCode = DEFAULT_EVENT_CODE): Promise<Question[]> {
  try {
    const rs = await pb.collection(COL.QUESTIONS).getFullList({
      sort: "-created",
      filter: `eventCode="${eventCode}"`,
      $autoCancel: false,
    })
    return rs.map(mapQuestion)
  } catch {
    return fallbackQuestions.filter((q) => q.eventCode === eventCode)
  }
}

export async function submitQuestion(input: QuestionInput): Promise<Question> {
  const data = {
    ...input,
    eventCode: input.eventCode ?? DEFAULT_EVENT_CODE,
    likes: 0,
    answered: false,
    hidden: false,
    pinned: false,
  }
  try {
    return mapQuestion(await pb.collection(COL.QUESTIONS).create(data, { $autoCancel: false }))
  } catch {
    const created = mapQuestion({ id: uid("q"), ...data, created: nowIso() })
    fallbackQuestions.unshift(created)
    return created
  }
}

export async function likeQuestion(id: string): Promise<void> {
  try {
    await pb.collection(COL.QUESTIONS).update(id, { "likes+": 1 }, { $autoCancel: false })
  } catch {
    const q = fallbackQuestions.find((item) => item.id === id)
    if (q) q.likes += 1
  }
}

export async function toggleAnswered(id: string, answered: boolean): Promise<void> {
  await updateQuestionFlag(id, "answered", answered)
}

export async function toggleHidden(id: string, hidden: boolean): Promise<void> {
  await updateQuestionFlag(id, "hidden", hidden)
}

export async function pinQuestion(id: string, pinned: boolean): Promise<void> {
  await updateQuestionFlag(id, "pinned", pinned)
}

async function updateQuestionFlag(id: string, key: "answered" | "hidden" | "pinned", value: boolean): Promise<void> {
  try {
    await pb.collection(COL.QUESTIONS).update(id, { [key]: value }, { $autoCancel: false })
  } catch {
    const q = fallbackQuestions.find((item) => item.id === id)
    if (q) q[key] = value
  }
}

export async function getActiveQuizSession(eventCode = DEFAULT_EVENT_CODE): Promise<QuizSession> {
  try {
    const rs = await pb.collection(COL.QUIZ_SESSIONS).getFullList({
      sort: "-created",
      filter: `eventCode="${eventCode}"`,
      $autoCancel: false,
    })
    const first = rs[0]
    return first ? mapQuizSession(first) : { ...fallbackQuizSession, eventCode }
  } catch {
    return { ...fallbackQuizSession, eventCode }
  }
}

export async function updateQuizSession(id: string, patch: QuizSessionPatch): Promise<QuizSession> {
  const nextPatch: Record<string, unknown> = { ...patch }
  if (patch.status === "question") nextPatch.questionStartedAt = nowIso()
  if (patch.status === "locked") nextPatch.questionLockedAt = nowIso()
  try {
    return mapQuizSession(await pb.collection(COL.QUIZ_SESSIONS).update(id, nextPatch, { $autoCancel: false }))
  } catch {
    const merged = {
      ...fallbackQuizSession,
      ...patch,
      questionStartedAt: typeof nextPatch.questionStartedAt === "string" ? nextPatch.questionStartedAt : fallbackQuizSession.questionStartedAt,
      questionLockedAt: typeof nextPatch.questionLockedAt === "string" ? nextPatch.questionLockedAt : fallbackQuizSession.questionLockedAt,
    }
    Object.assign(fallbackQuizSession, merged)
    return { ...fallbackQuizSession }
  }
}

export async function listQuizQuestions(quizSessionId = "quiz_main"): Promise<QuizQuestion[]> {
  try {
    const rs = await pb.collection(COL.QUIZ_QUESTIONS).getFullList({
      sort: "+order",
      filter: `quizSessionId="${quizSessionId}"`,
      $autoCancel: false,
    })
    const mapped = rs.map(mapQuizQuestion)
    return mapped.length > 0 ? mapped : [...fallbackQuizQuestions]
  } catch {
    return fallbackQuizQuestions.filter((q) => q.quizSessionId === quizSessionId)
  }
}

export async function listQuizPlayers(quizSessionId = "quiz_main"): Promise<QuizPlayer[]> {
  try {
    const rs = await pb.collection(COL.QUIZ_PLAYERS).getFullList({
      sort: "-score,+rank",
      filter: `quizSessionId="${quizSessionId}"`,
      $autoCancel: false,
    })
    return rankQuizPlayers(rs.map(mapQuizPlayer))
  } catch {
    return rankQuizPlayers(fallbackQuizPlayers.filter((p) => p.quizSessionId === quizSessionId))
  }
}

export async function listQuizAnswers(quizSessionId = "quiz_main"): Promise<QuizAnswer[]> {
  try {
    const rs = await pb.collection(COL.QUIZ_ANSWERS).getFullList({
      sort: "+created",
      filter: `quizSessionId="${quizSessionId}"`,
      $autoCancel: false,
    })
    return rs.map(mapQuizAnswer)
  } catch {
    return fallbackQuizAnswers.filter((a) => a.quizSessionId === quizSessionId)
  }
}

export async function ensureQuizPlayer(session: QuizSession, participant: Participant): Promise<QuizPlayer> {
  const existing = (await listQuizPlayers(session.id)).find((p) => p.participantId === participant.id)
  if (existing) return existing

  const data = {
    quizSessionId: session.id,
    participantId: participant.id,
    displayName: participant.name,
    score: 0,
    rank: 0,
    correctCount: 0,
    totalResponseMs: 0,
    answeredCount: 0,
  }
  try {
    return mapQuizPlayer(await pb.collection(COL.QUIZ_PLAYERS).create(data, { $autoCancel: false }))
  } catch {
    const created = mapQuizPlayer({ id: uid("qp"), ...data, created: nowIso() })
    fallbackQuizPlayers.push(created)
    return created
  }
}

export async function submitQuizAnswer(
  session: QuizSession,
  question: QuizQuestion,
  participant: Participant,
  choiceId: string,
): Promise<QuizAnswer> {
  const existing = (await listQuizAnswers(session.id)).find(
    (a) => a.participantId === participant.id && a.questionId === question.id,
  )
  if (existing) return existing
  if (session.status !== "question") throw new Error("현재 문제 응답 시간이 아닙니다.")

  const answeredAt = nowIso()
  const started = session.questionStartedAt ? new Date(session.questionStartedAt).getTime() : Date.now()
  const responseMs = Math.max(0, Date.now() - started)
  const isCorrect = question.correctChoiceId === choiceId
  const points = calcQuizPoints({
    isCorrect,
    responseMs,
    timeLimitSec: question.timeLimitSec,
    basePoints: question.basePoints,
    speedBonusPoints: question.speedBonusPoints,
  })
  const data = {
    quizSessionId: session.id,
    questionId: question.id,
    participantId: participant.id,
    choiceId,
    isCorrect,
    answeredAt,
    responseMs,
    points,
  }

  try {
    const created = mapQuizAnswer(await pb.collection(COL.QUIZ_ANSWERS).create(data, { $autoCancel: false }))
    const player = await ensureQuizPlayer(session, participant)
    await pb.collection(COL.QUIZ_PLAYERS).update(
      player.id,
      {
        score: player.score + points,
        correctCount: player.correctCount + (isCorrect ? 1 : 0),
        totalResponseMs: player.totalResponseMs + responseMs,
        answeredCount: player.answeredCount + 1,
        lastAnsweredAt: answeredAt,
      },
      { $autoCancel: false },
    )
    return created
  } catch {
    const created = mapQuizAnswer({ id: uid("qa"), ...data, created: answeredAt })
    fallbackQuizAnswers.push(created)
    const player = await ensureQuizPlayer(session, participant)
    const fallbackPlayer = fallbackQuizPlayers.find((p) => p.id === player.id)
    if (fallbackPlayer) {
      fallbackPlayer.score += points
      fallbackPlayer.correctCount += isCorrect ? 1 : 0
      fallbackPlayer.totalResponseMs += responseMs
      fallbackPlayer.answeredCount += 1
      fallbackPlayer.lastAnsweredAt = answeredAt
    }
    return created
  }
}

export async function listDrawPrizes(eventCode = DEFAULT_EVENT_CODE): Promise<DrawPrize[]> {
  try {
    const rs = await pb.collection(COL.DRAW_PRIZES).getFullList({
      sort: "+order",
      filter: `eventCode="${eventCode}"`,
      $autoCancel: false,
    })
    const mapped = rs.map(mapPrize)
    return mapped.length > 0 ? mapped : fallbackPrizes.filter((p) => p.eventCode === eventCode)
  } catch {
    return fallbackPrizes.filter((p) => p.eventCode === eventCode)
  }
}

export async function listDrawWinners(eventCode = DEFAULT_EVENT_CODE): Promise<DrawWinner[]> {
  try {
    const rs = await pb.collection(COL.DRAW_WINNERS).getFullList({
      sort: "-created",
      filter: `eventCode="${eventCode}"`,
      $autoCancel: false,
    })
    return rs.map(mapWinner)
  } catch {
    return fallbackWinners.filter((w) => w.eventCode === eventCode)
  }
}

export async function drawPrizeWinner(eventCode: string, prizeId: string): Promise<DrawWinner | null> {
  const [participants, winners] = await Promise.all([
    listParticipants(eventCode),
    listDrawWinners(eventCode),
  ])
  const candidate = pickDrawWinner(getEligibleDrawCandidates(participants, winners))
  if (!candidate) return null

  const data = {
    eventCode,
    prizeId,
    participantId: candidate.id,
    participantName: candidate.name,
    drawnAt: nowIso(),
    voided: false,
  }
  try {
    return mapWinner(await pb.collection(COL.DRAW_WINNERS).create(data, { $autoCancel: false }))
  } catch {
    const winner = mapWinner({ id: uid("dw"), ...data, created: data.drawnAt })
    fallbackWinners.unshift(winner)
    return winner
  }
}

async function subscribeCollection<T>(
  collection: string,
  cb: (action: "create" | "update" | "delete", record: T) => void,
  mapper: (record: unknown) => T,
): Promise<() => void> {
  try {
    return await pb.collection(collection).subscribe("*", (e) => {
      cb(e.action as "create" | "update" | "delete", mapper(e.record))
    })
  } catch {
    return () => {}
  }
}

export async function subscribeQuestions(
  cb: (action: "create" | "update" | "delete", record: Question) => void,
): Promise<() => void> {
  return subscribeCollection(COL.QUESTIONS, cb, mapQuestion)
}

export async function subscribeParticipants(
  cb: (action: "create" | "update" | "delete", record: Participant) => void,
): Promise<() => void> {
  return subscribeCollection(COL.PARTICIPANTS, cb, mapParticipant)
}

export async function subscribeQuizSession(
  cb: (action: "create" | "update" | "delete", record: QuizSession) => void,
): Promise<() => void> {
  return subscribeCollection(COL.QUIZ_SESSIONS, cb, mapQuizSession)
}

export async function subscribeQuizPlayers(
  cb: (action: "create" | "update" | "delete", record: QuizPlayer) => void,
): Promise<() => void> {
  return subscribeCollection(COL.QUIZ_PLAYERS, cb, mapQuizPlayer)
}

export async function subscribeQuizAnswers(
  cb: (action: "create" | "update" | "delete", record: QuizAnswer) => void,
): Promise<() => void> {
  return subscribeCollection(COL.QUIZ_ANSWERS, cb, mapQuizAnswer)
}

export async function subscribeDrawWinners(
  cb: (action: "create" | "update" | "delete", record: DrawWinner) => void,
): Promise<() => void> {
  return subscribeCollection(COL.DRAW_WINNERS, cb, mapWinner)
}
