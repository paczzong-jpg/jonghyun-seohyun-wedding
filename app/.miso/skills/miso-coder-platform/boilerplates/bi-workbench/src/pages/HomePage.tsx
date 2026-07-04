/**
 * HomePage — 데이터셋 라이브러리 (GOAL_UIUX §2)
 * 카드 그리드 + 전체 페이지 드롭 타깃 + 온보딩 empty state + 최근 대시보드
 */

import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Clipboard,
  CloudOff,
  Compass,
  Database,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useCharts,
  useDashboards,
  useDatasets,
  useDeleteDataset,
  useRenameDataset,
} from "@/lib/bi-hooks";
import type { BiDatasetRecord } from "@/lib/bi-types";
import { SAMPLE_DATASETS } from "@/lib/bi-samples";
import { isAcceptedFile } from "@/lib/bi-ingest";
import { formatBytes, formatRelativeTime } from "@/lib/bi-format";
import { ImportWizard, type ImportRequest } from "@/components/bi/import-wizard";

function DatasetCard({
  dataset,
  chartCount,
  onRename,
  onDelete,
}: {
  dataset: BiDatasetRecord;
  chartCount: number;
  onRename: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/data/${dataset.id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/data/${dataset.id}`)}
      className="group relative flex cursor-pointer flex-col gap-3 p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Database className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{dataset.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {dataset.rowCount.toLocaleString()}행 · {dataset.fields.length}열 · {formatBytes(dataset.byteSize)}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={`${dataset.name} 메뉴`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => navigate(`/viz/${dataset.id}`)}>
              <Compass className="size-4" /> 탐색 열기
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRename}>
              <Pencil className="size-4" /> 이름 변경
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
              <Trash2 className="size-4" /> 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>차트 {chartCount}개</span>
        <span>{formatRelativeTime(dataset.updated)}</span>
      </div>
    </Card>
  );
}

function EmptyState({ onImport }: { onImport: (r: ImportRequest) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-16">
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border px-8 py-14 text-center transition-colors hover:border-ring hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
          <Upload className="size-5 text-secondary-foreground" />
        </div>
        <div>
          <div className="text-base font-semibold">파일을 끌어다 놓으세요</div>
          <div className="mt-1 text-sm text-muted-foreground">
            CSV · Excel · JSON — 또는 클릭해서 파일 선택
          </div>
        </div>
      </button>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept=".csv,.tsv,.txt,.xlsx,.xls,.json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport({ kind: "file", file: f });
          e.target.value = "";
        }}
      />
      <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> 또는 샘플로 시작 <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SAMPLE_DATASETS.map((s) => (
          <Button
            key={s.key}
            variant="outline"
            className="h-auto flex-col items-start gap-0.5 px-4 py-2.5"
            onClick={() => onImport({ kind: "sample", sampleKey: s.key })}
          >
            <span className="text-sm font-medium">{s.emoji} {s.name}</span>
            <span className="text-xs font-normal text-muted-foreground">{s.description}</span>
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onImport({ kind: "paste" })}>
        <Clipboard className="size-4" /> 클립보드에서 붙여넣기
      </Button>
    </div>
  );
}

/** 데이터 서버(PocketBase) 연결 실패 — 빈 온보딩으로 위장하지 않는다 */
function ConnectionErrorState({ onRetry }: { onRetry: () => void }) {
  return (
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
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="size-4" /> 다시 시도
      </Button>
    </div>
  );
}

export function HomePage() {
  const { data: datasets, isLoading, isError, refetch } = useDatasets();
  const { data: charts } = useCharts();
  const { data: dashboards } = useDashboards();
  const renameDataset = useRenameDataset();
  const deleteDataset = useDeleteDataset();

  const [importRequest, setImportRequest] = useState<ImportRequest | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "rows">("recent");
  const [renaming, setRenaming] = useState<BiDatasetRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<BiDatasetRecord | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const chartCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of charts ?? []) map.set(c.datasetId, (map.get(c.datasetId) ?? 0) + 1);
    return map;
  }, [charts]);

  const visible = useMemo(() => {
    let list = datasets ?? [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "rows") list = [...list].sort((a, b) => b.rowCount - a.rowCount);
    return list;
  }, [datasets, search, sort]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files)[0];
    if (!file) return;
    if (!isAcceptedFile(file)) {
      toast.error("지원하지 않는 파일 형식입니다 (CSV/Excel/JSON)");
      return;
    }
    setImportRequest({ kind: "file", file });
  };

  const hasData = (datasets?.length ?? 0) > 0;

  return (
    <div
      className="bi-dots relative h-full overflow-y-auto"
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          dragDepth.current++;
          setDragOver(true);
        }
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragOver(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-3 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-ring bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-lg font-medium">
            <Upload className="size-6" /> 여기에 놓으면 업로드됩니다
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <ConnectionErrorState onRetry={() => void refetch()} />
        ) : !hasData ? (
          <EmptyState onImport={setImportRequest} />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-semibold tracking-tight">Data</h1>
              <span className="text-sm text-muted-foreground">{datasets!.length}개</span>
              <div className="flex-1" />
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="검색…"
                  aria-label="데이터셋 검색"
                  name="dataset-search"
                  autoComplete="off"
                  className="h-8 w-48 pl-8"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">최근 사용</SelectItem>
                  <SelectItem value="name">이름순</SelectItem>
                  <SelectItem value="rows">행 수</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-8">
                    <Plus className="size-4" /> 새 데이터
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
                    <Upload className="size-4" /> 파일 업로드
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setImportRequest({ kind: "paste" })}>
                    <Clipboard className="size-4" /> 클립보드 붙여넣기
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {SAMPLE_DATASETS.map((s) => (
                    <DropdownMenuItem key={s.key} onSelect={() => setImportRequest({ kind: "sample", sampleKey: s.key })}>
                      {s.emoji} {s.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="bi-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((d) => (
                <DatasetCard
                  key={d.id}
                  dataset={d}
                  chartCount={chartCounts.get(d.id) ?? 0}
                  onRename={() => {
                    setRenaming(d);
                    setRenameValue(d.name);
                  }}
                  onDelete={() => setDeleting(d)}
                />
              ))}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={cn(
                  "flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-ring hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <Plus className="size-5" />
                드래그 또는 클릭
              </button>
            </div>

            {visible.length === 0 && search && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                "{search}"에 해당하는 데이터셋이 없습니다
              </div>
            )}

            {(dashboards?.length ?? 0) > 0 && (
              <div className="mt-10">
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">최근 대시보드</h2>
                <div className="flex flex-wrap gap-2">
                  {dashboards!.slice(0, 6).map((d) => (
                    <Button key={d.id} variant="outline" size="sm" asChild>
                      <Link to={`/dash/${d.id}`}>
                        <LayoutDashboard className="size-4" /> {d.name}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept=".csv,.tsv,.txt,.xlsx,.xls,.json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setImportRequest({ kind: "file", file: f });
          e.target.value = "";
        }}
      />

      <ImportWizard request={importRequest} onClose={() => setImportRequest(null)} />

      <Dialog open={renaming !== null} onOpenChange={(v) => !v && setRenaming(null)}>
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
              if (e.key === "Enter" && renaming && renameValue.trim()) {
                renameDataset.mutate({ id: renaming.id, name: renameValue.trim() });
                setRenaming(null);
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>취소</Button>
            <Button
              disabled={!renameValue.trim()}
              onClick={() => {
                if (renaming) renameDataset.mutate({ id: renaming.id, name: renameValue.trim() });
                setRenaming(null);
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>“{deleting?.name}” 데이터셋을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              업로드된 데이터 파일과 함께 삭제되며 되돌릴 수 없습니다. 이 데이터셋을 쓰는
              저장 차트·대시보드 위젯은 더 이상 렌더되지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleting) {
                  deleteDataset.mutate(deleting.id, {
                    onSuccess: () => toast.success("삭제했습니다"),
                  });
                }
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
