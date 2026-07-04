import type { Participant } from "@/lib/event-data"

const STORAGE_KEY = "event-app-participant"

export function readParticipantSession(eventCode?: string): Participant | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Participant
    return !eventCode || parsed.eventCode === eventCode ? parsed : null
  } catch {
    return null
  }
}

export function saveParticipantSession(participant: Participant): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(participant))
}
