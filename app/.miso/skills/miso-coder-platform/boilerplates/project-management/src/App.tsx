import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { CreateIssueDialog } from '@/components/project-management/create-issue-dialog'
import { ProjectAppShell } from '@/components/project-management/app-shell'
import { fallbackProjectData } from '@/lib/project-data'
import { useProjectManagementData } from '@/lib/project-queries'
import { ProjectUiProvider, useProjectUi } from '@/lib/project-ui'
import { InboxPage } from '@/pages/InboxPage'
import { IssuesPage } from '@/pages/IssuesPage'
import { MembersPage } from '@/pages/MembersPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TeamsPage } from '@/pages/TeamsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const pageMeta = {
  '/': ['Overview', 'Project health, inbox, and delivery rollup'],
  '/inbox': ['Inbox', 'Assignments, mentions, and due-date signals'],
  '/issues': ['Issues', 'Dense list and board views for runtime-backed issues'],
  '/projects': ['Projects', 'Health, priority, ownership, and progress'],
  '/teams': ['Teams', 'Team membership and project ownership'],
  '/members': ['Members', 'Workspace people and assignments'],
  '/settings': ['Settings', 'Workspace defaults and runtime collections'],
} as const

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectUiProvider>
        <BrowserRouter>
          <ProjectWorkspace />
        </BrowserRouter>
      </ProjectUiProvider>
      <Toaster richColors closeButton />
    </QueryClientProvider>
  )
}

function ProjectWorkspace() {
  const dataQuery = useProjectManagementData()
  const data = dataQuery.data ?? fallbackProjectData
  const ui = useProjectUi()
  const location = useLocation()
  const [title, description] = pageMeta[location.pathname as keyof typeof pageMeta] ?? pageMeta['/']
  const unreadCount = data.inbox.filter((item) => !item.read).length

  return (
    <>
      <Routes>
        <Route element={<ProjectAppShell teams={data.teams} unreadCount={unreadCount} title={title} description={description} search={ui.search} onSearch={ui.setSearch} onCreateIssue={() => ui.setCreateOpen(true)} />}>
          <Route index element={<OverviewPage data={data} loading={dataQuery.isFetching} />} />
          <Route path='inbox' element={<InboxPage data={data} loading={dataQuery.isFetching} />} />
          <Route path='issues' element={<IssuesPage data={data} loading={dataQuery.isFetching} />} />
          <Route path='projects' element={<ProjectsPage data={data} loading={dataQuery.isFetching} />} />
          <Route path='teams' element={<TeamsPage data={data} loading={dataQuery.isFetching} />} />
          <Route path='members' element={<MembersPage data={data} loading={dataQuery.isFetching} />} />
          <Route path='settings' element={<SettingsPage data={data} loading={dataQuery.isFetching} />} />
        </Route>
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
      <CreateIssueDialog data={data} />
    </>
  )
}
