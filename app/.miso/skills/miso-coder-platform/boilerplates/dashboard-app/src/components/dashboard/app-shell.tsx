import type { ReactNode } from "react"
import { useState } from "react"
import { NavLink } from "react-router-dom"
import { LayoutDashboard, BarChart3, Table2, Settings, Menu, Bell, User, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** ★ 네비게이션은 이 배열만 수정하면 된다. */
const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "대시보드", icon: LayoutDashboard },
  { to: "/analytics", label: "분석", icon: BarChart3 },
  { to: "/records", label: "데이터", icon: Table2 },
  { to: "/settings", label: "설정", icon: Settings },
]

/** 대시보드 공통 셸: 사이드바 + 탑바 + 메인. 페이지를 <AppShell title="...">로 감싼다. */
export function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 border-r border-border bg-card transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <div className="size-6 rounded bg-primary" />
          <span className="font-semibold">Console</span>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button className="md:hidden" aria-label="메뉴" onClick={() => setOpen(true)}>
              <Menu className="size-5" />
            </button>
            <h1 className="text-sm font-semibold">{title}</h1>
          </div>
          {/* 알림·사용자 버튼: 현재 동작 미구현 — 실제 기능 연결 시 onClick 추가 */}
          <div className="flex items-center gap-1">
            <button aria-label="알림" className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <Bell className="size-5" />
            </button>
            <button aria-label="사용자" className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <User className="size-5" />
            </button>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
