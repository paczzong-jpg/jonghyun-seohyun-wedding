import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { ProjectMember } from '@/lib/project-data'

export function AvatarStack({ members, limit = 4 }: { members: ProjectMember[]; limit?: number }) {
  const visible = members.slice(0, limit)
  const extra = members.length - visible.length
  return (
    <div className='flex items-center'>
      {visible.map((member, index) => (
        <Avatar key={member.key} className={cn('size-7 border-2 border-background', index > 0 && '-ml-2')}>
          <AvatarFallback className='text-[10px]'>{member.initials}</AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <div className='-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground'>
          +{extra}
        </div>
      )}
    </div>
  )
}
