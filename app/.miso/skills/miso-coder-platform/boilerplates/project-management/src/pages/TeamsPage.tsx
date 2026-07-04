import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TeamTable } from '@/components/project-management/team-table'
import type { ProjectPageProps } from '@/pages/page-types'

export function TeamsPage({ data }: ProjectPageProps) {
  return (
    <div className='p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Team membership, identifiers, project ownership, and issue load.</CardDescription>
        </CardHeader>
        <CardContent><TeamTable teams={data.teams} data={data} /></CardContent>
      </Card>
    </div>
  )
}
