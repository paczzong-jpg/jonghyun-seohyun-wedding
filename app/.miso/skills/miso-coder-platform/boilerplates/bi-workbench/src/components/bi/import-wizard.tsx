/**
 * ImportWizard — 업로드 플로우 (GOAL_UIUX §2.3)
 * 파일/붙여넣기/샘플 → 파싱 → 미리보기·확인 → 저장 → /d/:id 진입
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DataTable } from "@/lib/bi-types";
import { buildTable } from "@/lib/bi-profile";
import { parseFile, parsePastedText, pickSheet, type ParsedSource } from "@/lib/bi-ingest";
import { SAMPLE_DATASETS } from "@/lib/bi-samples";
import { useCreateDataset } from "@/lib/bi-hooks";
import { formatCell } from "@/lib/bi-format";

export type ImportRequest =
  | { kind: "file"; file: File }
  | { kind: "paste" }
  | { kind: "sample"; sampleKey: string };

type Phase =
  | { step: "paste" }
  | { step: "parsing"; label: string }
  | { step: "preview"; source: ParsedSource; table: DataTable; name: string }
  | { step: "saving"; name: string };

const TYPE_BADGE: Record<string, string> = {
  string: "Abc",
  int: "#",
  float: "#",
  bool: "T/F",
  date: "📅",
  datetime: "📅",
};

export function ImportWizard({
  request,
  onClose,
}: {
  request: ImportRequest | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const createDataset = useCreateDataset();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [pasteText, setPasteText] = useState("");

  const startParse = useCallback(async (label: string, job: () => Promise<ParsedSource>) => {
    setPhase({ step: "parsing", label });
    try {
      const source = await job();
      const table = buildTable("pending", source.grid);
      const name = source.fileName.replace(/\.[^.]+$/, "") || "새 데이터셋";
      setPhase({ step: "preview", source, table, name });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "파일을 읽지 못했습니다");
      setPhase(null);
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!request) {
      setPhase(null);
      return;
    }
    if (request.kind === "file") {
      void startParse(request.file.name, () => parseFile(request.file));
    } else if (request.kind === "sample") {
      const sample = SAMPLE_DATASETS.find((s) => s.key === request.sampleKey);
      if (!sample) return;
      setPhase({ step: "parsing", label: sample.name });
      // 생성이 무겁지 않지만 UI 페인트 먼저
      setTimeout(() => {
        const grid = sample.build();
        const table = buildTable("pending", grid);
        setPhase({
          step: "preview",
          source: { fileName: sample.name, sheetNames: [], activeSheet: "", grid, truncatedRows: 0 },
          table,
          name: sample.name,
        });
      }, 30);
    } else {
      setPasteText("");
      setPhase({ step: "paste" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const confirm = async () => {
    if (phase?.step !== "preview") return;
    const name = phase.name.trim() || "새 데이터셋";
    setPhase({ step: "saving", name });
    try {
      const record = await createDataset.mutateAsync({
        name,
        sourceName: phase.source.fileName,
        table: phase.table,
      });
      toast.success(`“${name}” 데이터셋을 만들었습니다`);
      onClose();
      setPhase(null);
      navigate(`/d/${record.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다");
      setPhase({ ...phase });
    }
  };

  const changeSheet = async (sheetName: string) => {
    if (phase?.step !== "preview") return;
    setPhase({ step: "parsing", label: sheetName });
    const source = await pickSheet(phase.source, sheetName);
    setPhase({ step: "preview", source, table: buildTable("pending", source.grid), name: phase.name });
  };

  const open = request !== null && phase !== null;
  const previewFields = phase?.step === "preview" ? phase.table.fields.slice(0, 8) : [];
  const previewRows = useMemo(() => {
    if (phase?.step !== "preview") return [];
    const t = phase.table;
    return Array.from({ length: Math.min(8, t.rowCount) }, (_, r) =>
      previewFields.map((f) => formatCell(t.columns[f.fid]?.[r] ?? null, f)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (onClose(), setPhase(null))}>
      <DialogContent className="sm:max-w-2xl">
        {phase?.step === "paste" && (
          <>
            <DialogHeader>
              <DialogTitle>데이터 붙여넣기</DialogTitle>
              <DialogDescription>
                스프레드시트 셀, CSV/TSV 텍스트, JSON 배열을 붙여넣으세요. 첫 행은 헤더로 처리됩니다.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              autoFocus
              spellCheck={false}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"region\trevenue\nAPAC\t1200\nEMEA\t840"}
              className="min-h-44 font-mono text-xs"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => (onClose(), setPhase(null))}>취소</Button>
              <Button
                disabled={!pasteText.trim()}
                onClick={() => void startParse("붙여넣은 데이터", () => parsePastedText(pasteText))}
              >
                다음
              </Button>
            </DialogFooter>
          </>
        )}

        {phase?.step === "parsing" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <div className="text-sm text-muted-foreground">{phase.label} 파싱 중…</div>
          </div>
        )}

        {phase?.step === "preview" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-muted-foreground" />
                데이터 확인
              </DialogTitle>
              <DialogDescription>
                {phase.table.rowCount.toLocaleString()}행 × {phase.table.fields.length}열 —
                타입은 자동 추론되며 가져온 뒤 언제든 바꿀 수 있습니다.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="ds-name">데이터셋 이름</Label>
                  <Input
                    id="ds-name"
                    name="dataset-name"
                    autoComplete="off"
                    value={phase.name}
                    onChange={(e) => setPhase({ ...phase, name: e.target.value })}
                  />
                </div>
                {phase.source.sheetNames.length > 1 && (
                  <div className="grid gap-1.5">
                    <Label>시트</Label>
                    <Select value={phase.source.activeSheet} onValueChange={(v) => void changeSheet(v)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {phase.source.sheetNames.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {phase.source.truncatedRows > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <TriangleAlert className="size-3.5 shrink-0" />
                  행 수 상한을 넘어 {phase.source.truncatedRows.toLocaleString()}행이 제외되었습니다.
                </div>
              )}

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-muted">
                      <tr>
                        {previewFields.map((f) => (
                          <th key={f.fid} className="whitespace-nowrap px-2.5 py-2 text-left">
                            <div className="font-medium">{f.displayName}</div>
                            <div className="mt-0.5 flex items-center gap-1">
                              <Badge variant="outline" className="h-4 rounded px-1 font-mono text-[9px]">
                                {TYPE_BADGE[f.dataType]}
                              </Badge>
                              <span className="text-[10px] font-normal text-muted-foreground">
                                {f.analyticType === "measure" ? "측정값" : "차원"}
                              </span>
                            </div>
                          </th>
                        ))}
                        {phase.table.fields.length > 8 && (
                          <th className="px-2.5 py-2 text-left text-[10px] font-normal text-muted-foreground">
                            +{phase.table.fields.length - 8}열
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-border/60">
                          {row.map((cell, j) => (
                            <td key={j} className="max-w-40 truncate px-2.5 py-1.5 tabular-nums">{cell}</td>
                          ))}
                          {phase.table.fields.length > 8 && <td className="px-2.5 text-muted-foreground">…</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => (onClose(), setPhase(null))}>취소</Button>
              <Button onClick={() => void confirm()}>가져오기</Button>
            </DialogFooter>
          </>
        )}

        {phase?.step === "saving" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <div className="text-sm text-muted-foreground">"{phase.name}" 저장 중…</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
