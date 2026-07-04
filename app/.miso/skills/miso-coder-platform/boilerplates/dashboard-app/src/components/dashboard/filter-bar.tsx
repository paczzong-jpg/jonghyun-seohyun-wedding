import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RotateCcw } from "lucide-react"

export type Filters = { region: string; from: string; to: string }

const REGIONS = ["전체", "전남", "경북", "제주", "강원"]
const INIT: Filters = { region: "전체", from: "", to: "" }

/** 기간/구분 필터 + 조회/초기화. onSearch로 상위에 필터를 전달한다. */
export function FilterBar({ onSearch }: { onSearch?: (f: Filters) => void }) {
  const [f, setF] = useState<Filters>(INIT)
  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }))

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
      <Select value={f.region} onValueChange={(v) => set({ region: v })}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder="지역" />
        </SelectTrigger>
        <SelectContent>
          {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} className="h-9 w-[150px]" />
      <span className="text-muted-foreground">~</span>
      <Input type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} className="h-9 w-[150px]" />
      <Button size="sm" className="h-9" onClick={() => onSearch?.(f)}>
        <Search className="mr-1 size-4" /> 조회
      </Button>
      <Button size="sm" variant="outline" className="h-9" onClick={() => { setF(INIT); onSearch?.(INIT) }}>
        <RotateCcw className="mr-1 size-4" /> 초기화
      </Button>
    </div>
  )
}
