import { format } from 'date-fns'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HealthBadge, PriorityBadge, ProjectStatusBadge } from '@/components/project-management/status-badge'
import type { ProjectIssue, ProjectRecord } from '@/lib/project-data'

export function ProjectTable({ projects, issues }: { projects: ProjectRecord[]; issues: ProjectIssue[] }) {
  return (
    <div className='rounded-md border bg-background'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Issues</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const count = issues.filter((issue) => issue.projectKey === project.key).length
            return (
              <TableRow key={project.key}>
                <TableCell>
                  <div className='flex flex-col gap-1'>
                    <span className='font-medium'>{project.name}</span>
                    <span className='line-clamp-1 text-xs text-muted-foreground'>{project.description}</span>
                  </div>
                </TableCell>
                <TableCell><HealthBadge health={project.health} /></TableCell>
                <TableCell><PriorityBadge priority={project.priority} /></TableCell>
                <TableCell>{project.lead}</TableCell>
                <TableCell>{project.targetDate ? format(new Date(project.targetDate), 'MMM d') : '-'}</TableCell>
                <TableCell>
                  <div className='flex min-w-[140px] items-center gap-2'>
                    <Progress value={project.percentComplete} className='h-2' />
                    <span className='w-8 text-xs text-muted-foreground'>{project.percentComplete}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <ProjectStatusBadge status={project.status} />
                    <span className='text-xs text-muted-foreground'>{count}</span>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
