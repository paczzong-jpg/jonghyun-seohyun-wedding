import { format } from 'date-fns'
import { Bell, Check, Clock3, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMarkInboxReadMutation } from '@/lib/project-queries'
import type { ProjectInboxItem } from '@/lib/project-data'

const kindIcon = {
  status: Bell,
  mention: MessageSquare,
  'due-date': Clock3,
} as const

export function InboxPanel({ items }: { items: ProjectInboxItem[] }) {
  const markRead = useMarkInboxReadMutation()
  return (
    <div className='flex flex-col rounded-md border bg-background'>
      {items.map((item) => {
        const Icon = kindIcon[item.kind]
        return (
          <div key={item.id} className='flex items-center gap-3 border-b px-4 py-3 last:border-b-0'>
            <div className='flex size-8 items-center justify-center rounded-md bg-muted'><Icon className='size-4 text-muted-foreground' /></div>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <span className='truncate text-sm font-medium'>{item.title}</span>
                {!item.read ? <Badge className='rounded-sm px-1.5'>New</Badge> : null}
              </div>
              <div className='truncate text-xs text-muted-foreground'>{item.issueIdentifier} · {item.actor} · {item.createdAt ? format(new Date(item.createdAt), 'MMM d HH:mm') : 'now'}</div>
            </div>
            {!item.read ? <Button variant='ghost' size='icon' onClick={() => markRead.mutate(item.id)}><Check className='size-4' /></Button> : null}
          </div>
        )
      })}
    </div>
  )
}
