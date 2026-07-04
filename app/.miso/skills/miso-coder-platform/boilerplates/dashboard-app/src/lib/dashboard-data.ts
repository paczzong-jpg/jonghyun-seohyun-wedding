// ★ PocketBase 실데이터 연결 스타터. 목업 시드 없음.
// 컬렉션 생성 후 아래 get* 함수가 즉시 동작한다.
// 컬렉션 생성은 $SM_INTERNAL_URL 내부 API로 (브라우저 코드에서 스키마 변경 금지).
// API Rules 는 반드시 "" (공개) 또는 인증 규칙으로 설정.

import pb from "@/lib/miso-sdk/runtime-client"
import type { LucideIcon } from "lucide-react"

// ★ PocketBase 컬렉션 이름 — 이 상수만 바꾸면 모든 get* 함수에 반영된다.
export const COLLECTION = "items"

// ---------------------------------------------------------------------------
// 타입 정의 (DashboardPage · 컴포넌트 시그니처 유지)
// ---------------------------------------------------------------------------

export type Kpi = {
  title: string
  value: string
  unit: string
  change: number | null // 증감률(%), null 이면 비교 없음
  compareLabel: string
  icon: LucideIcon
}

export type SeriesPoint = { label: string; value: number }

export type Row = {
  id: string
  name: string
  region: string
  output: number
  status: "정상" | "점검" | "긴급"
  updatedAt: string
}

// ---------------------------------------------------------------------------
// KPI 집계
// ---------------------------------------------------------------------------
/**
 * PocketBase 에는 서버 집계 쿼리가 없으므로 두 가지 패턴 중 선택한다.
 *
 * [패턴 A] 별도 stats 컬렉션 단순 조회 (권장 — 서버에서 집계 후 저장):
 *   const stat = await pb.collection("dashboard_stats").getFirstListItem("", { $autoCancel: false })
 *   return [
 *     { title: "금일 누적 처리량", value: String(stat.total_count), unit: "건",
 *       change: stat.change_rate as number, compareLabel: "전일대비", icon: Zap },
 *     { title: "평균 처리 시간",   value: String(stat.avg_duration), unit: "분",
 *       change: stat.duration_change as number, compareLabel: "전주대비", icon: Gauge },
 *     { title: "처리 완료율",      value: String(stat.completion_rate), unit: "%",
 *       change: stat.rate_change as number,     compareLabel: "전월대비", icon: TrendingUp },
 *     { title: "활성 사용자",      value: String(stat.active_users), unit: "명",
 *       change: null, compareLabel: `목표대비 ${stat.user_target_pct}%`, icon: Activity },
 *   ]
 *
 * [패턴 B] getFullList 후 클라이언트 집계 (소규모 데이터):
 *   const all = await pb.collection(COLLECTION).getFullList({ $autoCancel: false })
 *   const completed = all.filter((r) => r["status"] === "정상")
 *   return [
 *     { title: "전체 건수", value: String(all.length), unit: "건",
 *       change: null, compareLabel: "", icon: Activity },
 *     { title: "완료율", value: ((completed.length / all.length) * 100).toFixed(1), unit: "%",
 *       change: null, compareLabel: "", icon: TrendingUp },
 *   ]
 */
export async function getKpis(): Promise<Kpi[]> {
  // 집계 구현 전까지 빈 배열 반환 — KpiCards 는 items=[] 일 때 그리드를 렌더하지 않음
  return []
}

// ---------------------------------------------------------------------------
// 차트 시리즈
// ---------------------------------------------------------------------------
/**
 * 월별(또는 일별) 추이 시리즈.
 * getFullList 후 날짜 필드 기준으로 클라이언트 그룹핑 예:
 *
 *   const records = await pb.collection(COLLECTION).getFullList({ sort: "created", $autoCancel: false })
 *   const byMonth: Record<string, number> = {}
 *   for (const r of records) {
 *     const label = r.created.slice(0, 7) // "YYYY-MM"
 *     byMonth[label] = (byMonth[label] ?? 0) + 1
 *   }
 *   return Object.entries(byMonth).map(([label, value]) => ({ label, value }))
 */
export async function getSeries(): Promise<SeriesPoint[]> {
  // 집계 구현 전까지 빈 배열 반환 — OverviewChart 는 data=[] 일 때 빈 카드로 표시됨
  return []
}

/**
 * 비교 시리즈 (전년 동기 등).
 * getSeries() 와 동일한 방식으로 구현하되 기간 조건을 조정한다.
 *
 *   const oneYearAgo = new Date()
 *   oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
 *   const records = await pb.collection(COLLECTION).getFullList({
 *     sort: "created",
 *     filter: `created >= "${oneYearAgo.toISOString().slice(0, 7)}-01 00:00:00"`,
 *     $autoCancel: false,
 *   })
 *   // ... 동일한 그룹핑 로직
 */
export async function getCompareSeries(): Promise<SeriesPoint[]> {
  return []
}

// ---------------------------------------------------------------------------
// 목록 테이블
// ---------------------------------------------------------------------------
/**
 * PocketBase 레코드 → Row 타입 매핑
 *
 * 컬렉션 스키마 (COLLECTION = "items"):
 *   name   : Text   (required)  →  Row.name
 *   region : Text               →  Row.region
 *   output : Number             →  Row.output
 *   status : Select             →  Row.status  (values: 정상, 점검, 긴급)
 *   id     : (자동 생성)        →  Row.id
 *   updated: (자동 갱신)        →  Row.updatedAt  ("YYYY-MM-DD HH:mm" 으로 슬라이스)
 *
 * 타입 안전이 필요하면 `.miso/bin/pb-typegen` 으로 생성한 @/types/pb-types 를 사용한다.
 */
export async function getRows(): Promise<Row[]> {
  const records = await pb.collection(COLLECTION).getFullList({ sort: "-created", $autoCancel: false })
  return records.map((r) => ({
    id: r.id,
    name: (r["name"] as string) ?? "",
    region: (r["region"] as string) ?? "",
    output: Number(r["output"]) || 0,
    status: (r["status"] as Row["status"]) ?? "정상",
    // PocketBase `updated` 필드는 "YYYY-MM-DD HH:mm:ss.sssZ" 형식 → "YYYY-MM-DD HH:mm" 으로 정규화
    updatedAt: ((r.updated as string) ?? "").slice(0, 16).replace("T", " "),
  }))
}
