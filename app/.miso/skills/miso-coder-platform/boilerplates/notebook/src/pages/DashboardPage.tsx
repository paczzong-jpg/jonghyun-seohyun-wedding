import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import {
  createNotebook,
  deleteNotebook,
  listNotebooks,
  searchAll,
  updateNotebook,
  type SearchHit,
} from "@/lib/notebook/db";
import type { Notebook } from "@/lib/notebook/types";
import { useTheme } from "@/lib/notebook/use-theme";
import { APP_NAME, APP_TAGLINE, DEFAULT_COLOR, NOTEBOOK_COLORS } from "@/lib/notebook-config";

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 30) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState<Notebook[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const { theme, toggle } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);

  const load = () => listNotebooks().then(setNotebooks).catch(console.error);
  useEffect(() => {
    load();
  }, []);

  // ⌘K / Ctrl+K → 검색 포커스
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 전역 검색 (디바운스)
  useEffect(() => {
    if (query.trim().length < 2) {
      setHits(null);
      return;
    }
    const timer = window.setTimeout(() => {
      searchAll(query.trim()).then(setHits).catch(console.error);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const visible = useMemo(
    () => (notebooks ?? []).filter((n) => n.archived === showArchived),
    [notebooks, showArchived],
  );
  const archivedCount = useMemo(
    () => (notebooks ?? []).filter((n) => n.archived).length,
    [notebooks],
  );

  return (
    <div className="min-h-full bg-background">
      {/* 상단 바 */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles size={15} strokeWidth={2.4} />
            </span>
            <span className="text-[15px] font-extrabold tracking-tight">{APP_NAME}</span>
          </div>
          <div className="relative ml-auto w-full max-w-sm">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="모든 노트북·소스·노트 검색"
              className="h-9 rounded-full border-input bg-card pl-9 pr-12 text-[13px]"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              ⌘K
            </kbd>
            {hits && (
              <div className="absolute inset-x-0 top-11 overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--nb-shadow-pop)]">
                {hits.length === 0 ? (
                  <p className="px-4 py-3 text-[13px] text-muted-foreground">검색 결과가 없습니다</p>
                ) : (
                  hits.slice(0, 8).map((hit) => (
                    <button
                      key={`${hit.kind}-${hit.id}`}
                      type="button"
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted"
                      onClick={() => navigate(`/notebook/${hit.notebook}`)}
                    >
                      <span className="mt-0.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">
                        {hit.kind === "source" ? "소스" : hit.kind === "note" ? "노트" : "채팅"}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">{hit.title}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">
                          {hit.snippet}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-none text-muted-foreground"
            onClick={toggle}
            aria-label="테마 전환"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight">
              {showArchived ? "보관된 노트북" : "내 노트북"}
            </h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">{APP_TAGLINE}</p>
          </div>
          <div className="flex items-center gap-2">
            {archivedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setShowArchived((v) => !v)}
              >
                <Archive size={15} />
                {showArchived ? "노트북으로 돌아가기" : `보관함 ${archivedCount}`}
              </Button>
            )}
            <Button onClick={() => setCreateOpen(true)} className="rounded-full px-4 font-bold">
              <Plus size={16} strokeWidth={2.6} /> 새 노트북
            </Button>
          </div>
        </div>

        {/* 그리드 */}
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks === null &&
            Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}

          {notebooks !== null && !showArchived && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="group flex h-40 flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-input bg-transparent transition-colors hover:border-primary/60 hover:bg-secondary/40"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground transition-transform group-hover:scale-110">
                <Plus size={19} strokeWidth={2.5} />
              </span>
              <span className="text-[13.5px] font-bold text-muted-foreground group-hover:text-foreground">
                새 노트북 만들기
              </span>
            </button>
          )}

          {visible.map((notebook) => (
            <NotebookCard
              key={notebook.id}
              notebook={notebook}
              onOpen={() => navigate(`/notebook/${notebook.id}`)}
              onChanged={load}
            />
          ))}
        </div>

        {notebooks !== null && visible.length === 0 && showArchived && (
          <p className="mt-16 text-center text-[14px] text-muted-foreground">
            보관된 노트북이 없습니다
          </p>
        )}

        {notebooks !== null && notebooks.length === 0 && !showArchived && (
          <div className="mt-14 flex flex-col items-center text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              <BookOpen size={26} strokeWidth={1.8} />
            </span>
            <h2 className="mt-4 text-[17px] font-extrabold">첫 노트북을 만들어보세요</h2>
            <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
              PDF·웹페이지·텍스트를 소스로 모으면, 근거 있는 답변과 요약·오디오 브리핑까지
              한 곳에서 만들 수 있습니다.
            </p>
          </div>
        )}
      </main>

      <CreateNotebookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(nb) => navigate(`/notebook/${nb.id}`)}
      />
    </div>
  );
}

// ── 카드 ───────────────────────────────────────

function NotebookCard({
  notebook,
  onOpen,
  onChanged,
}: {
  notebook: Notebook;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const color = NOTEBOOK_COLORS[notebook.color] ?? NOTEBOOK_COLORS[DEFAULT_COLOR];

  return (
    <div
      className="group relative flex h-40 cursor-pointer flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--nb-shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--nb-shadow-pop)]"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      <div className="flex items-start justify-between">
        <span
          className="grid h-10 w-10 place-items-center rounded-xl text-[16px] font-extrabold"
          style={{ background: color.bg, color: color.fg }}
        >
          {notebook.name.trim().slice(0, 1) || "N"}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={() =>
                updateNotebook(notebook.id, { archived: !notebook.archived }).then(onChanged)
              }
            >
              {notebook.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
              {notebook.archived ? "보관 해제" : "보관"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (window.confirm(`'${notebook.name}' 노트북과 모든 데이터를 삭제할까요?`)) {
                  deleteNotebook(notebook.id).then(onChanged);
                }
              }}
            >
              <Trash2 size={15} /> 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h3 className="mt-3 line-clamp-1 text-[15.5px] font-bold tracking-tight">{notebook.name}</h3>
      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
        {notebook.description || "설명 없음"}
      </p>
      <p className="mt-auto text-[11.5px] font-medium text-[var(--nb-ink-faint)]">
        {relativeDate(notebook.updated)} 업데이트
      </p>
    </div>
  );
}

// ── 생성 다이얼로그 ────────────────────────────

function CreateNotebookDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (notebook: Notebook) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const notebook = await createNotebook({
        name: name.trim(),
        description: description.trim(),
        color,
      });
      onOpenChange(false);
      setName("");
      setDescription("");
      setColor(DEFAULT_COLOR);
      onCreated(notebook);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-extrabold">새 노트북</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-muted-foreground">
              이름
            </label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="예: 2026 시장 조사"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-muted-foreground">
              설명 <span className="font-normal">(선택)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 노트북에서 무엇을 조사하나요?"
              rows={2}
              className="resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-muted-foreground">
              커버 색
            </label>
            <div className="flex gap-2">
              {Object.entries(NOTEBOOK_COLORS).map(([key, spec]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  onClick={() => setColor(key)}
                  className="grid h-8 w-8 place-items-center rounded-full transition-transform hover:scale-110"
                  style={{
                    background: spec.bg,
                    boxShadow: color === key ? `0 0 0 2px var(--color-card), 0 0 0 4px ${spec.fg}` : undefined,
                  }}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: spec.fg }} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={submit} disabled={!name.trim() || busy} className="font-bold">
            만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
