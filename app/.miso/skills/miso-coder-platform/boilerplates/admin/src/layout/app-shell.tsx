import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/layout/app-sidebar'
import { CommandMenu } from '@/components/command-menu'
import { NavigationProgress } from '@/components/navigation-progress'
import { SkipToMain } from '@/components/skip-to-main'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AdminUiProvider } from '@/context/admin-ui-provider'

export function AppShell() {
  const [commandOpen, setCommandOpen] = useState(false)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  return (
    <AdminUiProvider>
      <TooltipProvider delayDuration={200}>
        <SidebarProvider>
          <SkipToMain />
          <NavigationProgress />
          <AppSidebar />
          <SidebarInset>
            <Outlet context={{ openCommandMenu: () => setCommandOpen(true) }} />
          </SidebarInset>
          <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
        </SidebarProvider>
      </TooltipProvider>
    </AdminUiProvider>
  )
}
