import type { DrawWinner, Participant } from "@/lib/event-types"

export function getEligibleDrawCandidates(
  participants: Participant[],
  winners: DrawWinner[],
): Participant[] {
  const excluded = new Set(
    winners
      .filter((winner) => !winner.voided)
      .map((winner) => winner.participantId),
  )
  return participants.filter((participant) => participant.checkedIn && !excluded.has(participant.id))
}

export function pickDrawWinner(candidates: Participant[]): Participant | null {
  if (candidates.length === 0) return null
  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index] ?? null
}
