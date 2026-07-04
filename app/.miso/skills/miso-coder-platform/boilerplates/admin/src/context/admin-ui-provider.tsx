import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
type SidebarVariant = 'sidebar' | 'floating' | 'inset'
type SidebarCollapsible = 'offcanvas' | 'icon' | 'none'

type AdminUiContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  sidebarVariant: SidebarVariant
  setSidebarVariant: (variant: SidebarVariant) => void
  sidebarCollapsible: SidebarCollapsible
  setSidebarCollapsible: (value: SidebarCollapsible) => void
  resetUi: () => void
}

const AdminUiContext = createContext<AdminUiContextValue | null>(null)
const DEFAULT_THEME: Theme = 'system'
const DEFAULT_VARIANT: SidebarVariant = 'inset'
const DEFAULT_COLLAPSIBLE: SidebarCollapsible = 'icon'

function storageGet<T extends string>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  return (window.localStorage.getItem(key) as T | null) || fallback
}

function storageSet(key: string, value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

export function AdminUiProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => storageGet('admin-theme', DEFAULT_THEME))
  const [sidebarVariant, setSidebarVariantState] = useState<SidebarVariant>(() => storageGet('admin-sidebar-variant', DEFAULT_VARIANT))
  const [sidebarCollapsible, setSidebarCollapsibleState] = useState<SidebarCollapsible>(() => storageGet('admin-sidebar-collapsible', DEFAULT_COLLAPSIBLE))

  useEffect(() => {
    const root = document.documentElement
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
  }, [theme])

  const value = useMemo<AdminUiContextValue>(() => ({
    theme,
    setTheme: (next) => {
      storageSet('admin-theme', next)
      setThemeState(next)
    },
    sidebarVariant,
    setSidebarVariant: (next) => {
      storageSet('admin-sidebar-variant', next)
      setSidebarVariantState(next)
    },
    sidebarCollapsible,
    setSidebarCollapsible: (next) => {
      storageSet('admin-sidebar-collapsible', next)
      setSidebarCollapsibleState(next)
    },
    resetUi: () => {
      storageSet('admin-theme', DEFAULT_THEME)
      storageSet('admin-sidebar-variant', DEFAULT_VARIANT)
      storageSet('admin-sidebar-collapsible', DEFAULT_COLLAPSIBLE)
      setThemeState(DEFAULT_THEME)
      setSidebarVariantState(DEFAULT_VARIANT)
      setSidebarCollapsibleState(DEFAULT_COLLAPSIBLE)
    },
  }), [theme, sidebarVariant, sidebarCollapsible])

  return <AdminUiContext.Provider value={value}>{children}</AdminUiContext.Provider>
}

export function useAdminUi() {
  const context = useContext(AdminUiContext)
  if (!context) throw new Error('useAdminUi must be used within AdminUiProvider')
  return context
}
