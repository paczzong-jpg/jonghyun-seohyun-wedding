import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { healthMeta, priorityMeta, projectStatusMeta, statusMeta, teamToneClass, type IssuePriority, type IssueStatus, type ProjectHealth, type ProjectStatus, type ProjectTeam } from '@/lib/project-data'

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const meta = statusMeta[status]
  return <MetaBadge icon={meta.icon} label={meta.label} />
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const meta = priorityMeta[priority]
  return (
    <MetaBadge
      icon={meta.icon}
      label={meta.label}
      className={priority === 'urgent' ? 'border-destructive/40 bg-destructive/10 text-destructive' : undefined}
    />
  )
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const meta = projectStatusMeta[status]
  return <MetaBadge icon={meta.icon} label={meta.label} />
}

export function HealthBadge({ health }: { health: ProjectHealth }) {
  const meta = healthMeta[health]
  return <MetaBadge icon={meta.icon} label={meta.label} variant={health === 'off-track' || health === 'at-risk' ? 'outline' : 'secondary'} />
}

export function TeamIcon({ team }: { team: ProjectTeam }) {
  return (
    <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold', teamToneClass[team.tone])}>
      {team.icon}
    </div>
  )
}

function MetaBadge({ icon: Icon, label, variant = 'outline', className }: { icon: LucideIcon; label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }) {
  return (
    <Badge variant={variant} className={cn('inline-flex min-w-0 items-center gap-1 rounded-md font-medium', className)}>
      <Icon className='size-3' />
      <span className='truncate'>{label}</span>
    </Badge>
  )
}
