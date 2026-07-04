/**
 * AppShell — 글로벌 프레임 (GOAL_UIUX §1.2)
 * AppBar(h-14): 로고 · 홈/대시보드 · ⌘K 검색 · 테마 · 설정
 */

import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  ChartLine,
  Database,
  LayoutDashboard,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDashboards, useDatasets } from "@/lib/bi-hooks";

function BrandMark() {
  return (
    <div className="flex size-8 items-center justify-center rounded-md bg-primary shadow-sm">
      <Sparkles className="size-4 text-primary-foreground" />
    </div>
  );
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { data: datasets } = useDatasets();
  const { data: dashboards } = useDashboards();

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="데이터셋, 대시보드 검색…" />
      <CommandList>
        <CommandEmpty>결과가 없습니다.</CommandEmpty>
        <CommandGroup heading="이동">
          <CommandItem onSelect={() => go("/data")}>
            <Database className="mr-2 size-4" /> Data — 데이터셋
          </CommandItem>
          <CommandItem onSelect={() => go("/viz")}>
            <ChartLine className="mr-2 size-4" /> Visualization — 탐색
          </CommandItem>
          <CommandItem onSelect={() => go("/dash")}>
            <LayoutDashboard className="mr-2 size-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Settings className="mr-2 size-4" /> 설정
          </CommandItem>
        </CommandGroup>
        {(datasets?.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="데이터셋">
              {datasets!.slice(0, 8).map((d) => (
                <CommandItem key={d.id} value={`dataset ${d.name}`} onSelect={() => go(`/data/${d.id}`)}>
                  <Database className="mr-2 size-4 text-muted-foreground" />
                  {d.name}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {d.rowCount.toLocaleString()}행
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {(dashboards?.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="대시보드">
              {dashboards!.slice(0, 8).map((d) => (
                <CommandItem key={d.id} value={`dashboard ${d.name}`} onSelect={() => go(`/dash/${d.id}`)}>
                  <LayoutDashboard className="mr-2 size-4 text-muted-foreground" />
                  {d.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
      isActive
        ? "bg-secondary text-secondary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="z-30 shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
          <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
            <BrandMark />
            <div className="leading-none">
              <div className="text-[15px] font-semibold tracking-tight">Prism</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">데이터 분석 스튜디오</div>
            </div>
          </NavLink>
          <nav className="ml-2 flex items-center gap-1">
            <NavLink to="/data" className={navClass}>
              <Database className="size-4" /> Data
            </NavLink>
            <NavLink to="/viz" className={navClass}>
              <ChartLine className="size-4" /> Visualization
            </NavLink>
            <NavLink to="/dash" className={navClass}>
              <LayoutDashboard className="size-4" /> Dashboard
            </NavLink>
          </nav>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="hidden h-8 w-56 justify-start gap-2 text-muted-foreground sm:flex"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="size-3.5" />
            <span className="text-[13px]">검색…</span>
            <kbd className="pointer-events-none ml-auto rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="테마 전환"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>테마 전환</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" asChild>
                <NavLink to="/settings" aria-label="설정">
                  <Settings className="size-4" />
                </NavLink>
              </Button>
            </TooltipTrigger>
            <TooltipContent>설정</TooltipContent>
          </Tooltip>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
