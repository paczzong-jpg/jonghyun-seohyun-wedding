import { List, PanelsTopLeft } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FilterToolbar } from '@/components/project-management/filter-toolbar'
import { IssueBoard } from '@/components/project-management/issue-board'
import { IssueList } from '@/components/project-management/issue-list'
import { useProjectUi } from '@/lib/project-ui'
import type { ProjectIssue } from '@/lib/project-data'
import type { ProjectPageProps } from '@/pages/page-types'

export function IssuesPage({ data }: ProjectPageProps) {
  const ui = useProjectUi()
  const issues = filterIssues(data.issues, ui.search, ui.statusFilter, ui.priorityFilter, ui.teamFilter)

  return (
    <div className='flex h-full min-h-[calc(100svh-56px)] flex-col bg-background'>
      <FilterToolbar teams={data.teams} />
      <Tabs defaultValue='list' className='flex min-h-0 flex-1 flex-col'>
        <div className='flex h-11 items-center justify-between border-b px-4'>
          <div className='text-sm text-muted-foreground'>{issues.length} issues</div>
          <TabsList className='h-8'>
            <TabsTrigger value='list' className='h-7'><List className='mr-2 size-4' />List</TabsTrigger>
            <TabsTrigger value='board' className='h-7'><PanelsTopLeft className='mr-2 size-4' />Board</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value='list' className='m-0 min-h-0 flex-1 overflow-auto'><IssueList issues={issues} data={data} /></TabsContent>
        <TabsContent value='board' className='m-0 min-h-0 flex-1 overflow-auto'><IssueBoard issues={issues} data={data} /></TabsContent>
      </Tabs>
    </div>
  )
}

function filterIssues(issues: ProjectIssue[], search: string, status: string, priority: string, team: string) {
  const query = search.trim().toLowerCase()
  return issues.filter((issue) => {
    if (query && ![issue.identifier, issue.title, issue.description, issue.assignee, issue.label].join(' ').toLowerCase().includes(query)) return false
    if (status !== 'all' && issue.status !== status) return false
    if (priority !== 'all' && issue.priority !== priority) return false
    if (team !== 'all' && issue.teamKey !== team) return false
    return true
  })
}
