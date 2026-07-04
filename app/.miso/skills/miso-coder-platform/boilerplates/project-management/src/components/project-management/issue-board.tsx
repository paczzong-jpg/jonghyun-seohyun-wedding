import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ISSUE_STATUSES, statusMeta, type IssueStatus, type ProjectIssue, type ProjectManagementData } from '@/lib/project-data'
import { PriorityBadge } from '@/components/project-management/status-badge'
import { useUpdateIssueStatusMutation } from '@/lib/project-queries'
import { useProjectUi } from '@/lib/project-ui'

export function IssueBoard({ issues, data }: { issues: ProjectIssue[]; data: ProjectManagementData }) {
  const ui = useProjectUi()
  return (
    <div className='flex h-full min-w-max gap-3 p-3'>
      {ISSUE_STATUSES.map((status) => {
        const meta = statusMeta[status]
        const columnIssues = issues.filter((issue) => issue.status === status)
        return (
          <section key={status} className='flex h-full w-[340px] shrink-0 flex-col overflow-hidden rounded-md border bg-background'>
            <div className='flex h-11 items-center justify-between border-b bg-muted/40 px-3'>
              <div className='flex items-center gap-2'>
                <meta.icon className='size-4 text-muted-foreground' />
                <span className='text-sm font-medium'>{meta.label}</span>
                <span className='text-sm text-muted-foreground'>{columnIssues.length}</span>
              </div>
              <Button variant='ghost' size='icon' aria-label={`Create ${meta.label} issue`} onClick={() => ui.setCreateOpen(true)}><Plus className='size-4' /></Button>
            </div>
            <div className='flex flex-1 flex-col gap-2 overflow-auto p-2'>
              {columnIssues.map((issue) => <IssueCard key={issue.id} issue={issue} data={data} />)}
              {columnIssues.length === 0 ? <div className='rounded-md border border-dashed p-4 text-sm text-muted-foreground'>Drop future work here by changing issue status.</div> : null}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function IssueCard({ issue, data }: { issue: ProjectIssue; data: ProjectManagementData }) {
  const updateStatus = useUpdateIssueStatusMutation()
  const member = data.members.find((item) => item.name === issue.assignee)
  const project = data.projects.find((item) => item.key === issue.projectKey)
  return (
    <article className='flex flex-col gap-3 rounded-md border bg-card p-3 shadow-sm'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs font-medium text-muted-foreground'>{issue.identifier}</span>
        <PriorityBadge priority={issue.priority} />
      </div>
      <div className='flex flex-col gap-1'>
        <h3 className='line-clamp-2 text-sm font-semibold'>{issue.title}</h3>
        <p className='line-clamp-2 text-xs text-muted-foreground'>{issue.description}</p>
      </div>
      <div className='flex flex-wrap items-center gap-1.5'>
        <Badge variant='secondary' className='rounded-md'>{issue.label}</Badge>
        <Badge variant='outline' className='rounded-md'>{project?.name || issue.projectKey}</Badge>
      </div>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs text-muted-foreground'>{issue.dueDate ? format(new Date(issue.dueDate), 'MMM d') : 'No date'}</span>
        <Avatar className='size-7'><AvatarFallback className='text-[10px]'>{member?.initials || issue.assignee.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
      </div>
      <Select value={issue.status} onValueChange={(value) => updateStatus.mutate({ id: issue.id, status: value as IssueStatus })}>
        <SelectTrigger className='h-8'><SelectValue /></SelectTrigger>
        <SelectContent>
          {ISSUE_STATUSES.map((status) => <SelectItem key={status} value={status}>{statusMeta[status].label}</SelectItem>)}
        </SelectContent>
      </Select>
    </article>
  )
}
