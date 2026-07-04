import { Link, useLocation } from 'react-router-dom'
import { Bell, CheckSquare, CircleDot, Inbox, LayoutDashboard, Settings, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { WorkspaceSwitcher } from '@/components/project-management/workspace-switcher'
import { TeamIcon } from '@/components/project-management/status-badge'
import { cn } from '@/lib/utils'
import type { ProjectTeam } from '@/lib/project-data'

const nav = [
  { title: 'Overview', href: '/', icon: LayoutDashboard },
  { title: 'Inbox', href: '/inbox', icon: Inbox },
  { title: 'Issues', href: '/issues', icon: CheckSquare },
  { title: 'Projects', href: '/projects', icon: CircleDot },
  { title: 'Teams', href: '/teams', icon: UsersRound },
  { title: 'Members', href: '/members', icon: UsersRound },
  { title: 'Settings', href: '/settings', icon: Settings },
]

export function ProjectSidebar({ teams, unreadCount, mobile = false }: { teams: ProjectTeam[]; unreadCount: number; mobile?: boolean }) {
  const location = useLocation()
  return (
    <aside className={cn('h-svh w-[270px] shrink-0 border-r bg-muted/30 p-2', mobile ? 'flex flex-col' : 'hidden lg:flex lg:flex-col')}>
      <WorkspaceSwitcher />
      <nav className='mt-3 flex flex-col gap-1'>
        {nav.map((item) => {
          const active = item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href)
          return (
            <Button key={item.href} variant={active ? 'secondary' : 'ghost'} className='h-8 justify-start px-2 text-sm' asChild>
              <Link to={item.href}>
                <item.icon className='mr-2 size-4' />
                <span className='flex-1 text-left'>{item.title}</span>
                {item.href === '/inbox' && unreadCount > 0 ? <Badge className='ml-auto rounded-sm px-1.5'>{unreadCount}</Badge> : null}
              </Link>
            </Button>
          )
        })}
      </nav>
      <Separator className='my-3' />
      <div className='flex items-center justify-between px-2 text-xs font-medium text-muted-foreground'>
        <span>Teams</span>
        <Bell className='size-3' />
      </div>
      <div className='mt-1 flex flex-col gap-1 overflow-auto'>
        {teams.map((team) => (
          <Button key={team.key} variant='ghost' className={cn('h-8 justify-start px-2 text-sm', !team.joined && 'text-muted-foreground')}>
            <TeamIcon team={team} />
            <span className='ml-2 truncate'>{team.name}</span>
            <span className='ml-auto text-[11px] text-muted-foreground'>{team.key}</span>
          </Button>
        ))}
      </div>
      <div className='mt-auto rounded-md border bg-background p-3'>
        <div className='text-sm font-medium'>Runtime backed</div>
        <div className='mt-1 text-xs text-muted-foreground'>Issues and projects use PocketBase through the managed runtime client.</div>
      </div>
    </aside>
  )
}
