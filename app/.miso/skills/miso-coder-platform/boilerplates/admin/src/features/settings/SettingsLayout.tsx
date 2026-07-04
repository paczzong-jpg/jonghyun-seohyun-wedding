import { Link, Outlet, useLocation } from 'react-router-dom'
import { Bell, MonitorCog, Palette, ShieldCheck, UserCog } from 'lucide-react'
import { Header } from '@/layout/header'
import { Main } from '@/layout/main'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const nav = [
  { title: 'Profile', href: '/settings', icon: UserCog },
  { title: 'Account', href: '/settings/account', icon: ShieldCheck },
  { title: 'Appearance', href: '/settings/appearance', icon: Palette },
  { title: 'Display', href: '/settings/display', icon: MonitorCog },
  { title: 'Notifications', href: '/settings/notifications', icon: Bell },
]

export function SettingsLayout() {
  const location = useLocation()
  return (
    <>
      <Header fixed>
        <div>
          <h1 className='text-sm font-semibold md:text-base'>Settings</h1>
          <p className='text-xs text-muted-foreground'>Account, UI, and notification preferences</p>
        </div>
      </Header>
      <Main>
        <div className='space-y-1'>
          <h2 className='text-2xl font-bold tracking-tight'>Settings</h2>
          <p className='text-muted-foreground'>Manage the generated admin experience without adding a custom settings framework.</p>
        </div>
        <Separator />
        <div className='grid gap-6 md:grid-cols-[220px_1fr]'>
          <nav className='flex gap-2 overflow-auto md:flex-col'>
            {nav.map((item) => {
              const active = location.pathname === item.href
              return (
                <Link key={item.href} to={item.href} className={cn('flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground', active && 'bg-muted text-foreground')}>
                  <item.icon className='size-4' />
                  {item.title}
                </Link>
              )
            })}
          </nav>
          <Outlet />
        </div>
      </Main>
    </>
  )
}
