import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InboxPanel } from '@/components/project-management/inbox-panel'
import type { ProjectPageProps } from '@/pages/page-types'

export function InboxPage({ data }: ProjectPageProps) {
  return (
    <div className='p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Assignments, mentions, and due-date changes from project activity.</CardDescription>
        </CardHeader>
        <CardContent><InboxPanel items={data.inbox} /></CardContent>
      </Card>
    </div>
  )
}
