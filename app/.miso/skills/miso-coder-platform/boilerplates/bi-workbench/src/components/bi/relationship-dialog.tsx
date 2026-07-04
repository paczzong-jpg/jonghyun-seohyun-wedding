/**
 * RelationshipDialog — 멀티테이블 조인(시맨틱 모델) 편집 (GOAL, Superset 데이터셋 조인)
 * 오른쪽(디멘션) 데이터셋 + 조인키 + 조인 종류를 정의하면 loadTable이 비정규화한다.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DataTable, JoinRelationship } from "@/lib/bi-types";
import { useDatasets, useUpdateDatasetRelationships } from "@/lib/bi-hooks";

function newRelId(existing: JoinRelationship[]): string {
  // fid 접두가 되므로 짧고 충돌 없는 값
  let n = 1;
  const used = new Set(existing.map((r) => r.id));
  while (used.has(`r${n}`)) n++;
  return `r${n}`;
}

export function RelationshipDialog({
  table,
  open,
  onOpenChange,
}: {
  table: DataTable;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const datasets = useDatasets();
  const updateRels = useUpdateDatasetRelationships();

  const current = datasets.data?.find((d) => d.id === table.datasetId);
  const rels = current?.relationships ?? [];
  const others = (datasets.data ?? []).filter((d) => d.id !== table.datasetId);
  // 왼쪽(현재) 데이터셋의 자기 소유 필드만 조인키 후보
  const leftFields = table.fields.filter((f) => !f.joinLabel && !f.derived);

  // 새 관계 폼 상태
  const [rightId, setRightId] = useState("");
  const [leftFid, setLeftFid] = useState("");
  const [rightFid, setRightFid] = useState("");
  const [kind, setKind] = useState<"inner" | "left">("left");

  const rightDataset = others.find((d) => d.id === rightId);
  const rightFields = useMemo(
    () => (rightDataset?.fields ?? []).filter((f) => !f.joinLabel && !f.derived),
    [rightDataset],
  );

  const datasetName = (id: string) => (datasets.data ?? []).find((d) => d.id === id)?.name ?? id;
  const fieldName = (fields: { fid: string; displayName: string }[], fid: string) =>
    fields.find((f) => f.fid === fid)?.displayName ?? fid;

  const commit = (next: JoinRelationship[]) =>
    updateRels.mutate(
      { id: table.datasetId, relationships: next },
      {
        onSuccess: () => toast.success("조인 관계를 저장했습니다"),
        onError: () => toast.error("조인 관계 저장에 실패했습니다"),
      },
    );

  const addRelationship = () => {
    if (!rightId || !leftFid || !rightFid) return;
    const rel: JoinRelationship = {
      id: newRelId(rels),
      rightDatasetId: rightId,
      leftFid,
      rightFid,
      kind,
    };
    commit([...rels, rel]);
    setRightId("");
    setLeftFid("");
    setRightFid("");
    setKind("left");
  };

  const removeRelationship = (id: string) => commit(rels.filter((r) => r.id !== id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" />
            데이터 조인
          </DialogTitle>
          <DialogDescription>
            다른 데이터셋을 조인키로 연결하면 그 필드를 이 데이터셋에서 바로 사용할 수 있습니다.
            룩업 조인이라 현재 행 수는 유지됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* 기존 관계 목록 */}
          {rels.length > 0 && (
            <div className="grid gap-2">
              {rels.map((r) => {
                const rd = (datasets.data ?? []).find((d) => d.id === r.rightDatasetId);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[13px]"
                  >
                    <span className="bi-lozenge bi-lozenge-info">{r.kind === "inner" ? "INNER" : "LEFT"}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{datasetName(table.datasetId)}</span>
                      <span className="text-muted-foreground"> · {fieldName(leftFields, r.leftFid)}</span>
                      <span className="mx-1.5 text-muted-foreground">↔</span>
                      <span className="font-medium">{datasetName(r.rightDatasetId)}</span>
                      <span className="text-muted-foreground">
                        {" "}· {fieldName(rd?.fields ?? [], r.rightFid)}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="관계 삭제"
                      onClick={() => removeRelationship(r.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 새 관계 추가 */}
          <div className="grid gap-3 rounded-lg border border-dashed border-border p-3">
            <div className="grid gap-1.5">
              <Label>조인할 데이터셋</Label>
              <Select value={rightId} onValueChange={(v) => { setRightId(v); setRightFid(""); }}>
                <SelectTrigger aria-label="조인할 데이터셋">
                  <SelectValue placeholder={others.length ? "데이터셋 선택" : "다른 데이터셋 없음"} />
                </SelectTrigger>
                <SelectContent>
                  {others.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} <span className="text-muted-foreground">({d.rowCount.toLocaleString()}행)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>현재 조인키</Label>
                <Select value={leftFid} onValueChange={setLeftFid}>
                  <SelectTrigger aria-label="현재 조인키"><SelectValue placeholder="필드 선택" /></SelectTrigger>
                  <SelectContent>
                    {leftFields.map((f) => (
                      <SelectItem key={f.fid} value={f.fid}>{f.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>상대 조인키</Label>
                <Select value={rightFid} onValueChange={setRightFid} disabled={!rightId}>
                  <SelectTrigger aria-label="상대 조인키"><SelectValue placeholder="필드 선택" /></SelectTrigger>
                  <SelectContent>
                    {rightFields.map((f) => (
                      <SelectItem key={f.fid} value={f.fid}>{f.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>조인 종류</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "inner" | "left")}>
                <SelectTrigger aria-label="조인 종류"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">LEFT — 현재 행 모두 유지(미매칭은 null)</SelectItem>
                  <SelectItem value="inner">INNER — 매칭되는 행만</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={addRelationship}
              disabled={!rightId || !leftFid || !rightFid || updateRels.isPending}
              className="justify-self-start"
            >
              <Plus className="size-4" /> 관계 추가
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
