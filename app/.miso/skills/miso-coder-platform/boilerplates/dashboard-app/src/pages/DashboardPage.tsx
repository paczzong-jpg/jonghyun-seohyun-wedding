import { useEffect, useState } from "react"
import { AppShell } from "@/components/dashboard/app-shell"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { OverviewChart } from "@/components/dashboard/overview-chart"
import { DataTable } from "@/components/dashboard/data-table"
import { FilterBar } from "@/components/dashboard/filter-bar"
import type { Filters } from "@/components/dashboard/filter-bar"
import { getKpis, getSeries, getCompareSeries, getRows, type Kpi, type SeriesPoint, type Row } from "@/lib/dashboard-data"

/**
 * 샘플 대시보드 — 블록을 "조립"만 한다. 데이터는 src/lib/dashboard-data.ts 에서 로드.
 * PocketBase 연결 시 get* 함수만 교체하면 이 페이지는 그대로 동작한다.
 */
export function DashboardPage() {
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [compareSeries, setCompareSeries] = useState<SeriesPoint[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [filteredRows, setFilteredRows] = useState<Row[]>([])

  useEffect(() => {
    let active = true
    Promise.all([getKpis(), getSeries(), getCompareSeries(), getRows()]).then(([k, s, c, r]) => {
      if (!active) return
      setKpis(k)
      setSeries(s)
      setCompareSeries(c)
      setRows(r)
      setFilteredRows(r)
    })
    return () => { active = false }
  }, [])

  const handleSearch = (f: Filters) => {
    setFilteredRows(
      rows.filter((r) => {
        const regionMatch = f.region === "전체" || r.region === f.region
        const date = r.updatedAt.slice(0, 10)
        const fromMatch = !f.from || date >= f.from
        const toMatch = !f.to || date <= f.to
        return regionMatch && fromMatch && toMatch
      })
    )
  }

  return (
    <AppShell title="운영 대시보드">
      <div className="space-y-4">
        <FilterBar onSearch={handleSearch} />
        <KpiCards items={kpis} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <OverviewChart title="월별 처리량 추이" data={series} />
          <OverviewChart title="월별 비교 (전년 동기)" data={compareSeries} />
        </div>
        <DataTable rows={filteredRows} />
      </div>
    </AppShell>
  )
}
