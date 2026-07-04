import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Newspaper, MessageSquareText, Sparkles, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_NAME_EN } from "@/lib/news-config";
import { useTheme } from "@/lib/news/use-theme";

// ────────────────────────────────────────────────
// 마스트헤드 — 워드마크 + 에디션 날짜 + 라이브 상태 + 내비. double rule 로 신문 문법 선언.
// ────────────────────────────────────────────────

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function editionLabel(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const [y, mo, d] = now.toISOString().slice(0, 10).split("-");
  const wd = WEEKDAYS[now.getUTCDay()];
  const edition = now.getUTCHours() < 12 ? "조간" : "석간";
  return `${y}년 ${Number(mo)}월 ${Number(d)}일 ${wd}요일 · ${edition}`;
}

interface Props {
  live?: { active: boolean; label: string };
}

const NAV = [
  { to: "/", label: "홈", icon: Newspaper },
  { to: "/briefing", label: "브리핑", icon: Sparkles },
  { to: "/chat", label: "질문", icon: MessageSquareText },
  { to: "/manage", label: "구독", icon: Settings2 },
];

export function Masthead({ live }: Props) {
  const { theme, toggle } = useTheme();
  const location = useLocation();

  return (
    <header className="nw-double-rule bg-[var(--nw-bg)] sticky top-0 z-30">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-3">
          <Link to="/" className="nw-serif text-2xl font-bold tracking-tight text-[var(--nw-ink)]">
            {APP_NAME}
            <span className="ml-1.5 align-middle text-xs font-semibold tracking-[0.2em] text-[var(--nw-ink-3)]">
              {APP_NAME_EN}
            </span>
          </Link>
          <span className="nw-meta hidden sm:inline">{editionLabel()}</span>
        </div>

        <div className="flex items-center gap-1">
          {live && (
            <span className="mr-2 hidden items-center gap-1.5 sm:flex">
              {live.active && <span className="nw-live-dot" />}
              <span className="nw-meta">{live.label}</span>
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="테마 전환">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>

      <nav className="mx-auto flex max-w-[1200px] gap-1 px-2 pb-2 sm:px-5">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-[var(--nw-accent-soft)] font-semibold text-[var(--nw-accent)]"
                  : "text-[var(--nw-ink-2)] hover:bg-[var(--nw-surface-2)]"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
