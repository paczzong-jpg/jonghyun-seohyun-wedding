import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AvatarStack } from '@/components/project-management/avatar-stack'
import { TeamIcon } from '@/components/project-management/status-badge'
import type { ProjectIssue, ProjectManagementData, ProjectTeam } from '@/lib/project-data'

export function TeamTable({ teams, data }: { teams: ProjectTeam[]; data: ProjectManagementData }) {
  return (
    <div className='rounded-md border bg-background'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Membership</TableHead>
            <TableHead>Identifier</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead>Issues</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => {
            const members = data.members.filter((member) => team.memberKeys.includes(member.key))
            const projects = data.projects.filter((project) => team.projectKeys.includes(project.key))
            const issues = data.issues.filter((issue: ProjectIssue) => issue.teamKey === team.key)
            return (
              <TableRow key={team.key}>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <TeamIcon team={team} />
                    <span className='font-medium'>{team.name}</span>
                  </div>
                </TableCell>
                <TableCell><Badge variant={team.joined ? 'secondary' : 'outline'}>{team.joined ? 'Joined' : 'Available'}</Badge></TableCell>
                <TableCell className='font-mono text-xs text-muted-foreground'>{team.key}</TableCell>
                <TableCell><AvatarStack members={members} /></TableCell>
                <TableCell>{projects.length}</TableCell>
                <TableCell>{issues.length}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
