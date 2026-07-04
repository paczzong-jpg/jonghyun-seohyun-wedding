/**
 * DashboardsPage — 대시보드 목록
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CloudOff, LayoutDashboard, MoreHorizontal, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { BiDashboardRecord } from "@/lib/bi-types";
import { useDashboards, useDeleteDashboard, useSaveDashboard } from "@/lib/bi-hooks";
import { formatRelativeTime } from "@/lib/bi-format";

export function DashboardsPage() {
  const navigate = useNavigate();
  const { data: dashboards, isLoading, isError, refetch } = useDashboards();
  const saveDashboard = useSaveDashboard();
  const deleteDashboard = useDeleteDashboard();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<BiDashboardRecord | null>(null);

  const create = () => {
    if (!name.trim()) return;
    saveDashboard.mutate(
      { name: name.trim(), config: { widgets: [], globalFilters: [], crossFilter: true } },
      {
        onSuccess: (d) => {
          setCreateOpen(false);
          setName("");
          navigate(`/dash/${d.id}`);
        },
        onError: () => toast.error("생성에 실패했습니다"),
      },
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-5 flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">대시보드</h1>
          <span className="text-sm text-muted-foreground">{dashboards?.length ?? 0}개</span>
          <div className="flex-1" />
          <Button size="sm" className="h-8" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> 새 대시보드
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <CloudOff className="size-5 text-destructive" />
            </div>
            <div>
              <div className="text-base font-semibold">데이터 서버에 연결할 수 없습니다</div>
              <p className="mt-1 text-sm text-muted-foreground">
                런타임(PocketBase)이 응답하지 않습니다. 잠시 후 다시 시도해 주세요.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="size-4" /> 다시 시도
            </Button>
          </div>
        ) : (dashboards?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
              <LayoutDashboard className="size-5 text-secondary-foreground" />
            </div>
            <div>
              <div className="text-base font-semibold">아직 대시보드가 없습니다</div>
              <div className="mt-1 text-sm text-muted-foreground">
                탐색 탭에서 차트를 만들고 "대시보드에 추가"로 시작하세요.
              </div>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> 빈 대시보드 만들기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboards!.map((d) => (
              <Card
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/dash/${d.id}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/dash/${d.id}`)}
                className="group cursor-pointer gap-3 p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <LayoutDashboard className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{d.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      위젯 {d.config.widgets.length}개
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={`${d.name} 메뉴`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(d)}>
                        <Trash2 className="size-4" /> 삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {formatRelativeTime(d.updated)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>새 대시보드</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="대시보드 이름"
            name="dashboard-name"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 월간 매출 리뷰"
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button disabled={!name.trim()} onClick={create}>만들기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>“{deleting?.name}” 대시보드를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              위젯 구성이 삭제됩니다. 저장된 차트 자체는 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleting) deleteDashboard.mutate(deleting.id, { onSuccess: () => toast.success("삭제했습니다") });
                setDeleting(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
