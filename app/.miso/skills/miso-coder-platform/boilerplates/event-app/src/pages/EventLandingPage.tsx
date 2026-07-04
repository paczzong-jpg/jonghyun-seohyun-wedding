import { EventHero } from "@/components/event/event-hero"
import { ScheduleSection } from "@/components/event/schedule-section"
import type { ScheduleItem } from "@/components/event/schedule-section"
import { SESSIONS } from "@/lib/event-data"

// ---------------------------------------------------------------------------
// 행사 메타 — 실제 행사 정보로 교체한다
// ---------------------------------------------------------------------------

const HERO = {
  title: "MISO Live 2026",
  tagline: "MISO Coder 팀이 함께 운영하는 라이브 데모 행사",
  date: "2026년 7월 15일 (화) 10:00",
  venue: "MISO 스튜디오",
  capacity: "현장 체크인 참가자 대상",
}

// ---------------------------------------------------------------------------
// 일정 — SESSIONS 상수에서 파생 + 비세션 항목(break) 수기 추가
// ---------------------------------------------------------------------------

// 세션 → 일정 태그/분류 매핑
const TAG_MAP: Record<string, string> = {
  keynote: "키노트",
  "ux-panel": "패널",
  operations: "운영",
}
const VARIANT_MAP: Record<string, ScheduleItem["tagVariant"]> = {
  keynote: "default",
  "ux-panel": "secondary",
}

// SESSIONS에 없는 비세션 항목 (등록, 점심, 브레이크, 클로징)
const BREAKS: ScheduleItem[] = [
  { time: "09:30", title: "등록 및 네트워킹", tag: "오프닝", tagVariant: "secondary" },
  { time: "12:00", title: "점심 식사 & 스폰서 부스", tag: "브레이크" },
  { time: "15:30", title: "커피 브레이크", tag: "브레이크" },
  { time: "17:30", title: "라이브 퀴즈 결과 & 경품 추첨", tag: "클로징", tagVariant: "default" },
]

/**
 * SESSIONS 상수 → ScheduleItem 변환.
 * 일정 섹션과 Q&A 세션 선택이 동일한 데이터 소스를 쓴다.
 */
const SCHEDULE: ScheduleItem[] = [
  ...SESSIONS.map((s): ScheduleItem => ({
    id: s.id,
    time: s.startTime,
    title: s.title,
    speaker: s.speaker
      ? `${s.speaker}${s.organization ? ` (${s.organization})` : ""}`
      : undefined,
    description: s.description,
    keywords: s.keywords,
    tag: TAG_MAP[s.id] ?? "세션",
    tagVariant: VARIANT_MAP[s.id] ?? "outline",
  })),
  ...BREAKS,
].sort((a, b) => a.time.localeCompare(b.time))

/**
 * 행사 랜딩 페이지 — 히어로 + 일정.
 * 행사 정보(HERO)와 세션(SESSIONS in event-data.ts)만 수정하면 된다.
 */
export function EventLandingPage() {
  return (
    <div className="space-y-10">
      <EventHero {...HERO} />
      <ScheduleSection items={SCHEDULE} />
    </div>
  )
}
