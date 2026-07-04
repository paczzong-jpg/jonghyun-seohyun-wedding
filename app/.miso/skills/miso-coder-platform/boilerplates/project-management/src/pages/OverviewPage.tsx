import { CheckCircle2, Clock3, FolderKanban, Inbox, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { InboxPanel } from '@/components/project-management/inbox-panel'
import { ProjectTable } from '@/components/project-management/project-table'
import { ISSUE_STATUSES } from '@/lib/project-data'
import type { ProjectPageProps } from '@/pages/page-types'

export function OverviewPage({ data, loading }: ProjectPageProps) {
  const done = data.issues.filter((issue) => issue.status === 'done').length
  const activeProjects = data.projects.filter((project) => project.status === 'active').length
  const unread = data.inbox.filter((item) => !item.read).length

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Metric title='Open issues' value={String(data.issues.length - done)} description='Across active teams' icon={Clock3} />
        <Metric title='Completed' value={String(done)} description='Closed this cycle' icon={CheckCircle2} />
        <Metric title='Projects' value={String(activeProjects)} description='Currently active' icon={FolderKanban} />
        <Metric title='Unread inbox' value={String(unread)} description='Needs attention' icon={Inbox} loading={loading} />
      </div>
      <div className='grid gap-4 xl:grid-cols-[1.35fr_0.65fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Workspace progress</CardTitle>
            <CardDescription>Issue distribution by workflow state.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>
            {ISSUE_STATUSES.map((status) => {
              const count = data.issues.filter((issue) => issue.status === status).length
              const value = data.issues.length ? (count / data.issues.length) * 100 : 0
              return (
                <div key={status} className='flex flex-col gap-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span>{status}</span>
                    <span className='font-medium'>{count}</span>
                  </div>
                  <Progress value={value} />
                </div>
              )
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>Recent assignments and project signals.</CardDescription>
          </CardHeader>
          <CardContent><InboxPanel items={data.inbox.slice(0, 4)} /></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Health, priority, lead, and delivery progress.</CardDescription>
        </CardHeader>
        <CardContent><ProjectTable projects={data.projects} issues={data.issues} /></CardContent>
      </Card>
    </div>
  )
}

function Metric({ title, value, description, icon: Icon, loading = false }: { title: string; value: string; description: string; icon: typeof Clock3; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between gap-2 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {loading ? <Loader2 className='size-4 animate-spin text-muted-foreground' /> : <Icon className='size-4 text-muted-foreground' />}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        <p className='text-xs text-muted-foreground'>{description}</p>
      </CardContent>
    </Card>
  )
}
