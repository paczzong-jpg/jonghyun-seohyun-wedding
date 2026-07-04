/**
 * WorkspacePage — 데이터셋 워크스페이스 프레임 (GOAL_UIUX §1.3)
 * WorkspaceBar(뒤로 · 이름 · 탭) + 좌측 필드 패널(그리드·탐색) + 탭 콘텐츠
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Loader2,
  PanelLeft,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChartSpec, FilterRule } from "@/lib/bi-types";
import { useDatasetTable, useDeleteDataset, useRenameDataset } from "@/lib/bi-hooks";
import { encodeSpecParam } from "@/lib/bi-derive";
import { AiPanel } from "@/components/bi/ai-panel";
import { FieldListPanel } from "@/components/bi/field-list-panel";
import { ProfileTab } from "@/components/bi/profile-tab";
import { GridTab } from "@/components/bi/grid-tab";
import { InsightsTab } from "@/components/bi/insights-tab";
import { CausalTab } from "@/components/bi/causal-tab";

export type WorkspaceTab = "profile" | "grid" | "eda" | "causal";

const TABS: { id: WorkspaceTab; label: string; path: (id: string) => string }[] = [
  { id: "profile", label: "프로파일", path: (id) => `/data/${id}` },
  { id: "grid", label: "그리드", path: (id) => `/data/${id}/grid` },
  { id: "eda", label: "인사이트", path: (id) => `/data/${id}/eda` },
  { id: "causal", label: "인과분석", path: (id) => `/data/${id}/causal` },
];

export function WorkspacePage({ tab }: { tab: WorkspaceTab }) {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useDatasetTable(datasetId);
  const renameDataset = useRenameDataset();
  const deleteDataset = useDeleteDataset();

  const [gridFilters, setGridFilters] = useState<FilterRule[]>([]);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 탭 단축키 1/2/3 (GOAL_UIUX §12)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = ["1", "2", "3", "4"].indexOf(e.key);
      if (idx >= 0 && datasetId) navigate(TABS[idx].path(datasetId));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [datasetId, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <div className="text-sm text-muted-foreground">데이터셋 로드 중…</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <AlertCircle className="size-6 text-destructive" />
        <div className="text-sm text-muted-foreground">데이터셋을 불러오지 못했습니다</div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/">홈으로</Link>
        </Button>
      </div>
    );
  }

  const { record, table } = data;
  const showFieldPanel = tab !== "profile";

  // Data 페이지에서 AI가 만든 차트는 Visualization으로 연다
  const currentSpec: ChartSpec | null = null;
  const openSpecInExplore = (next: ChartSpec) =>
    navigate(`/viz/${record.id}?spec=${encodeSpecParam({ ...next, datasetId: record.id })}`);

  const content =
    tab === "profile" ? (
      <ProfileTab record={record} table={table} />
    ) : tab === "grid" ? (
      <GridTab table={table} filters={gridFilters} onFiltersChange={setGridFilters} />
    ) : tab === "eda" ? (
      <InsightsTab record={record} table={table} />
    ) : (
      <CausalTab record={record} table={table} />
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* WorkspaceBar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button variant="ghost" size="icon" className="size-7" asChild>
          <Link to="/data" aria-label="Data로">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        {showFieldPanel && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setPanelCollapsed((v) => !v)}
            aria-label="필드 패널 접기/펼치기"
            title="필드 패널 접기/펼치기"
          >
            <PanelLeft className="size-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 font-semibold">
              {record.name}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onSelect={() => {
                setRenameValue(record.name);
                setRenameOpen(true);
              }}
            >
              <Pencil className="size-4" /> 이름 변경
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" /> 데이터셋 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-xs tabular-nums text-muted-foreground">
          {record.rowCount.toLocaleString()}행
        </span>
        <div className="flex-1" />
        <nav className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          {TABS.map((t) => (
            <Link
              key={t.id}
              to={t.path(record.id)}
              className={cn(
                "rounded-md px-3 py-1 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        <Button
          variant={aiOpen ? "secondary" : "outline"}
          size="sm"
          className={cn("h-8 gap-1.5", !aiOpen && "text-primary")}
          onClick={() => setAiOpen((v) => !v)}
        >
          <Sparkles className="size-4" /> AI
        </Button>
      </div>

      {/* 본문 */}
      <div className="flex min-h-0 flex-1">
        {showFieldPanel && !panelCollapsed && (
          <aside className="w-60 shrink-0 border-r border-border">
            <FieldListPanel table={table} />
          </aside>
        )}
        <div className="min-w-0 flex-1">{content}</div>
        {aiOpen && (
          <aside className="w-[360px] shrink-0 border-l border-border">
            <AiPanel
              record={record}
              table={table}
              currentSpec={currentSpec}
              onOpenSpec={openSpecInExplore}
            />
          </aside>
        )}
      </div>

      {/* 이름 변경 */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>이름 변경</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="데이터셋 이름"
            name="dataset-name"
            autoComplete="off"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameValue.trim()) {
                renameDataset.mutate({ id: record.id, name: renameValue.trim() });
                setRenameOpen(false);
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>취소</Button>
            <Button
              disabled={!renameValue.trim()}
              onClick={() => {
                renameDataset.mutate({ id: record.id, name: renameValue.trim() });
                setRenameOpen(false);
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>“{record.name}” 데이터셋을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              데이터 파일과 함께 삭제되며 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() =>
                deleteDataset.mutate(record.id, {
                  onSuccess: () => {
                    toast.success("삭제했습니다");
                    navigate("/data");
                  },
                })
              }
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
