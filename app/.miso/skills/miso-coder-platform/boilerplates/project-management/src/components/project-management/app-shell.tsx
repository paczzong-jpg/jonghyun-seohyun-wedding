import { Outlet } from 'react-router-dom'
import { ProjectSidebar } from '@/components/project-management/sidebar'
import { ProjectTopbar } from '@/components/project-management/topbar'
import type { ProjectTeam } from '@/lib/project-data'

export function ProjectAppShell({ teams, unreadCount, title, description, search, onSearch, onCreateIssue }: { teams: ProjectTeam[]; unreadCount: number; title: string; description: string; search: string; onSearch: (value: string) => void; onCreateIssue: () => void }) {
  return (
    <div className='flex h-svh overflow-hidden bg-background'>
      <ProjectSidebar teams={teams} unreadCount={unreadCount} />
      <div className='flex min-w-0 flex-1 flex-col'>
        <ProjectTopbar title={title} description={description} teams={teams} unreadCount={unreadCount} search={search} onSearch={onSearch} onCreateIssue={onCreateIssue} />
        <main className='min-h-0 flex-1 overflow-auto bg-muted/20'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
