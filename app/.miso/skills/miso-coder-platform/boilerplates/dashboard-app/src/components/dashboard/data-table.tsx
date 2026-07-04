import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Row } from "@/lib/dashboard-data"

const STATUS_STYLE: Record<Row["status"], string> = {
  정상: "border-transparent bg-primary/10 text-primary",
  점검: "border-transparent bg-muted text-muted-foreground",
  긴급: "border-transparent bg-destructive/15 text-destructive",
}

type SortKey = keyof Pick<Row, "name" | "region" | "output" | "status" | "updatedAt">

/** 정렬 + 상태 뱃지 포함 테이블. shadcn Table 사용. */
export function DataTable({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("output")
  const [asc, setAsc] = useState(false)

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "ko")
      return asc ? cmp : -cmp
    })
  }, [rows, sortKey, asc])

  const toggle = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v)
    else { setSortKey(key); setAsc(true) }
  }

  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <button onClick={() => toggle(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <ChevronsUpDown className="size-3 opacity-50" />
      </button>
    </TableHead>
  )

  return (
    <Card className="overflow-hidden p-0 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHead k="name" label="이름" />
            <SortHead k="region" label="지역" />
            <SortHead k="output" label="출력(%)" className="text-right" />
            <SortHead k="status" label="상태" />
            <SortHead k="updatedAt" label="갱신" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                데이터 없음
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-foreground">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.region}</TableCell>
                <TableCell className="text-right tabular-nums">{r.output.toFixed(1)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(STATUS_STYLE[r.status])}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.updatedAt}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
