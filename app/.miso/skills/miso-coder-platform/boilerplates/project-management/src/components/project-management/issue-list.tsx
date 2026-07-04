import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ISSUE_STATUSES, statusMeta, type IssueStatus, type ProjectIssue, type ProjectManagementData } from '@/lib/project-data'
import { IssueStatusBadge, PriorityBadge } from '@/components/project-management/status-badge'
import { useUpdateIssueStatusMutation } from '@/lib/project-queries'

export function IssueList({ issues, data }: { issues: ProjectIssue[]; data: ProjectManagementData }) {
  const updateStatus = useUpdateIssueStatusMutation()
  const grouped = ISSUE_STATUSES.map((status) => ({
    status,
    issues: issues.filter((issue) => issue.status === status),
  }))

  return (
    <div className='flex flex-col'>
      {grouped.map((group) => {
        const meta = statusMeta[group.status]
        return (
          <section key={group.status} className='border-b'>
            <div className='sticky top-0 z-10 flex h-10 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur'>
              <meta.icon className='size-4 text-muted-foreground' />
              <span className='text-sm font-medium'>{meta.label}</span>
              <span className='text-sm text-muted-foreground'>{group.issues.length}</span>
            </div>
            {group.issues.length === 0 ? (
              <div className='px-4 py-4 text-sm text-muted-foreground'>No issues in {meta.label.toLowerCase()}.</div>
            ) : (
              group.issues.map((issue) => {
                const member = data.members.find((item) => item.name === issue.assignee)
                const project = data.projects.find((item) => item.key === issue.projectKey)
                return (
                  <div key={issue.id} className='border-b px-4 py-3 text-sm hover:bg-muted/60 sm:flex sm:min-h-12 sm:items-center sm:gap-2 sm:border-b-0 sm:py-0'>
                    <div className='sm:hidden'>
                      <div className='flex items-start gap-3'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <PriorityBadge priority={issue.priority} />
                            <IssueStatusBadge status={issue.status} />
                            <span className='text-xs font-medium text-muted-foreground'>{issue.identifier}</span>
                          </div>
                          <div className='mt-2 line-clamp-2 font-medium leading-snug'>{issue.title}</div>
                          <div className='mt-1 truncate text-xs text-muted-foreground'>
                            {project?.name || issue.projectKey} / {issue.label} / {issue.dueDate ? format(new Date(issue.dueDate), 'MMM d') : '-'}
                          </div>
                        </div>
                        <Avatar className='size-8'><AvatarFallback className='text-[10px]'>{member?.initials || issue.assignee.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      </div>
                      <div className='mt-3 flex items-center gap-2'>
                        <IssueStatusSelect issue={issue} onChange={(status) => updateStatus.mutate({ id: issue.id, status })} className='h-9 flex-1' />
                        <Button variant='ghost' size='icon' aria-label={`Open ${issue.identifier}`}><ChevronRight className='size-4' /></Button>
                      </div>
                    </div>
                    <div className='hidden min-w-0 flex-1 items-center gap-2 sm:flex'>
                      <PriorityBadge priority={issue.priority} />
                      <span className='w-[82px] shrink-0 font-medium text-muted-foreground'>{issue.identifier}</span>
                      <IssueStatusBadge status={issue.status} />
                      <div className='min-w-0 flex-1'>
                        <div className='truncate font-medium'>{issue.title}</div>
                        <div className='truncate text-xs text-muted-foreground'>{project?.name || issue.projectKey}</div>
                      </div>
                      <span className='hidden text-xs text-muted-foreground md:block'>{issue.label}</span>
                      <span className='hidden text-xs text-muted-foreground lg:block'>{issue.dueDate ? format(new Date(issue.dueDate), 'MMM d') : '-'}</span>
                      <Avatar className='size-7'><AvatarFallback className='text-[10px]'>{member?.initials || issue.assignee.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <IssueStatusSelect issue={issue} onChange={(status) => updateStatus.mutate({ id: issue.id, status })} className='h-8 w-[132px]' />
                      <Button variant='ghost' size='icon' aria-label={`Open ${issue.identifier}`}><ChevronRight className='size-4' /></Button>
                    </div>
                  </div>
                )
              })
            )}
            <Separator />
          </section>
        )
      })}
    </div>
  )
}

function IssueStatusSelect({ issue, onChange, className }: { issue: ProjectIssue; onChange: (status: IssueStatus) => void; className: string }) {
  return (
    <Select value={issue.status} onValueChange={(value) => onChange(value as IssueStatus)}>
      <SelectTrigger className={className}><SelectValue /></SelectTrigger>
      <SelectContent>
        {ISSUE_STATUSES.map((status) => <SelectItem key={status} value={status}>{statusMeta[status].label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
