import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MemberTable } from '@/components/project-management/member-table'
import type { ProjectPageProps } from '@/pages/page-types'

export function MembersPage({ data }: ProjectPageProps) {
  return (
    <div className='p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>MISO project workspace members and team assignments.</CardDescription>
        </CardHeader>
        <CardContent><MemberTable members={data.members} teams={data.teams} /></CardContent>
      </Card>
    </div>
  )
}
