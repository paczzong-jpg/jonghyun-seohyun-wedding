/**
 * AddToDashboardDialog — 탐색 중인 차트를 대시보드 위젯으로 (GOAL §11)
 * 차트가 미저장이면 먼저 저장한 뒤 위젯을 추가한다.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LayoutDashboard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChartSpec, DashboardConfig } from "@/lib/bi-types";
import { useDashboards, useSaveChart, useSaveDashboard } from "@/lib/bi-hooks";

function newWidgetLayout(config: DashboardConfig, kpi: boolean) {
  const maxY = config.widgets.reduce((a, w) => Math.max(a, w.layout.y + w.layout.h), 0);
  return { x: 0, y: maxY, w: kpi ? 3 : 6, h: kpi ? 2 : 4 };
}

export function AddToDashboardDialog({
  open,
  onOpenChange,
  datasetId,
  spec,
  chartId,
  chartName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  datasetId: string;
  spec: ChartSpec;
  chartId: string | null;
  chartName: string;
}) {
  const navigate = useNavigate();
  const { data: dashboards } = useDashboards();
  const saveChart = useSaveChart();
  const saveDashboard = useSaveDashboard();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const addTo = async (target: { id?: string; name: string; config: DashboardConfig }) => {
    setBusy(true);
    try {
      let ensuredChartId = chartId;
      if (!ensuredChartId) {
        const saved = await saveChart.mutateAsync({
          datasetId,
          name: chartName,
          spec: { ...spec, meta: { ...spec.meta, title: chartName } },
        });
        ensuredChartId = saved.id;
      }
      const kpi = spec.markType === "kpi";
      const config: DashboardConfig = {
        ...target.config,
        widgets: [
          ...target.config.widgets,
          {
            id: `w_${Date.now().toString(36)}`,
            kind: "chart",
            chartId: ensuredChartId,
            layout: newWidgetLayout(target.config, kpi),
          },
        ],
      };
      const saved = await saveDashboard.mutateAsync({ id: target.id, name: target.name, config });
      toast.success(`“${target.name}”에 추가했습니다`, {
        action: { label: "이동", onClick: () => navigate(`/dash/${saved.id}`) },
      });
      onOpenChange(false);
    } catch {
      toast.error("추가에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>대시보드에 추가</DialogTitle>
          <DialogDescription>"{chartName}" 차트를 위젯으로 추가합니다.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {(dashboards ?? []).map((d) => (
            <Button
              key={d.id}
              variant="outline"
              className="justify-start"
              disabled={busy}
              onClick={() => void addTo(d)}
            >
              <LayoutDashboard className="size-4 text-muted-foreground" />
              {d.name}
              <span className="ml-auto text-xs text-muted-foreground">
                위젯 {d.config.widgets.length}개
              </span>
            </Button>
          ))}
          {(dashboards?.length ?? 0) === 0 && (
            <div className="py-2 text-center text-sm text-muted-foreground">
              아직 대시보드가 없습니다 — 아래에서 새로 만드세요.
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-start">
          <div className="flex w-full gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="예: 월간 리뷰"
              aria-label="새 대시보드 이름"
              name="dashboard-name"
              autoComplete="off"
              onKeyDown={(e) =>
                e.key === "Enter" &&
                newName.trim() &&
                void addTo({ name: newName.trim(), config: { widgets: [], globalFilters: [], crossFilter: true } })
              }
            />
            <Button
              disabled={!newName.trim() || busy}
              onClick={() =>
                void addTo({ name: newName.trim(), config: { widgets: [], globalFilters: [], crossFilter: true } })
              }
            >
              <Plus className="size-4" /> 생성
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
