import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectTable } from '@/components/project-management/project-table'
import type { ProjectPageProps } from '@/pages/page-types'

export function ProjectsPage({ data }: ProjectPageProps) {
  return (
    <div className='p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Linear-style project rollup backed by PocketBase records.</CardDescription>
        </CardHeader>
        <CardContent><ProjectTable projects={data.projects} issues={data.issues} /></CardContent>
      </Card>
    </div>
  )
}
