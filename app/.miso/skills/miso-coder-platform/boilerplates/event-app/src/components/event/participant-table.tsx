import { useMemo, useState } from "react"
import { ChevronsUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Participant } from "@/lib/event-data"

type SortKey = keyof Pick<Participant, "name" | "affiliation" | "email" | "createdAt">

type Props = {
  rows: Participant[]
}

/** 참가자 목록 테이블 — 정렬 지원. shadcn Table 사용. */
export function ParticipantTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [asc, setAsc] = useState(false)

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), "ko")
      return asc ? cmp : -cmp
    })
  }, [rows, sortKey, asc])

  const toggle = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v)
    else { setSortKey(key); setAsc(true) }
  }

  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <button
        onClick={() => toggle(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
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
            <SortHead k="affiliation" label="소속" />
            <SortHead k="email" label="이메일" />
            <TableHead>체크인</TableHead>
            <SortHead k="createdAt" label="신청일시" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                신청자가 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.affiliation}</TableCell>
                <TableCell className="text-muted-foreground">{p.email}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      p.checkedIn
                        ? "border-transparent bg-primary/10 text-primary"
                        : "border-transparent bg-muted text-muted-foreground"
                    }
                  >
                    {p.checkedIn ? "완료" : "대기"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.createdAt}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
