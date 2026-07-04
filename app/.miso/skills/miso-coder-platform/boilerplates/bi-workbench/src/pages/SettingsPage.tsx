/**
 * SettingsPage — 일반·데이터 설정 (GOAL_UIUX §11)
 */

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useDatasets, useDeleteDataset } from "@/lib/bi-hooks";
import { formatBytes } from "@/lib/bi-format";
import { MAX_CHART_ROWS, MAX_UPLOAD_ROWS } from "@/lib/bi-types";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: datasets } = useDatasets();
  const deleteDataset = useDeleteDataset();
  const [purgeOpen, setPurgeOpen] = useState(false);

  const totalBytes = useMemo(
    () => (datasets ?? []).reduce((a, d) => a + d.byteSize, 0),
    [datasets],
  );

  const themeOptions = [
    { value: "light", label: "라이트", icon: Sun },
    { value: "dark", label: "다크", icon: Moon },
    { value: "system", label: "시스템", icon: Monitor },
  ] as const;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-6 text-lg font-semibold tracking-tight">설정</h1>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">일반</h2>
          <Card className="gap-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>테마</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">화면 색상 모드</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
                {themeOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setTheme(o.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      theme === o.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <o.icon className="size-3.5" /> {o.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">성능 한도</h2>
          <Card className="gap-3 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span>차트 최대 표시 행</span>
              <span className="tabular-nums text-muted-foreground">
                {MAX_CHART_ROWS.toLocaleString()}행 — 초과 시 자동 잘림
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>업로드 최대 행</span>
              <span className="tabular-nums text-muted-foreground">
                {MAX_UPLOAD_ROWS.toLocaleString()}행
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              연산은 브라우저 메모리에서 수행됩니다. 이 한도는 반응성을 지키기 위한 상한입니다.
            </p>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">데이터</h2>
          <Card className="gap-4 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>저장 용량</span>
              <span className="tabular-nums text-muted-foreground">
                데이터셋 {(datasets ?? []).length}개 · {formatBytes(totalBytes)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-destructive">전체 데이터셋 삭제</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  모든 데이터셋과 업로드 파일을 삭제합니다. 차트·대시보드는 렌더되지 않게 됩니다.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={(datasets?.length ?? 0) === 0}
                onClick={() => setPurgeOpen(true)}
              >
                <Trash2 className="size-4" /> 일괄 삭제
              </Button>
            </div>
          </Card>
        </section>
      </div>

      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>모든 데이터셋을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {(datasets ?? []).length}개 데이터셋({formatBytes(totalBytes)})이 영구 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                for (const d of datasets ?? []) {
                  await deleteDataset.mutateAsync(d.id).catch(() => undefined);
                }
                toast.success("모든 데이터셋을 삭제했습니다");
              }}
            >
              전부 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
