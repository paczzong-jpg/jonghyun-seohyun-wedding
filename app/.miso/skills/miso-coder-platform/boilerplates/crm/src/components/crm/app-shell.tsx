import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { Building2, FileText, Kanban, LayoutDashboard, Menu, SquareCheckBig, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CRM_APP } from "@/lib/crm-config"
import { cn } from "@/lib/utils"

type AppShellProps = {
  children: ReactNode
}

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/tasks", label: "Tasks", icon: SquareCheckBig },
  { to: "/quotes", label: "Quotes", icon: FileText },
]

function NavItems() {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          <item.icon className="size-4 shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="메뉴 열기" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Kanban className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{CRM_APP.title}</p>
            <p className="truncate text-xs text-muted-foreground">{CRM_APP.subtitle}</p>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border bg-card md:block">
          <NavItems />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-5">{children}</div>
        </main>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-40 bg-foreground/25 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold">{CRM_APP.title}</span>
          <Button variant="ghost" size="icon" aria-label="메뉴 닫기" onClick={() => setMobileOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <NavItems />
      </aside>
    </div>
  )
}
