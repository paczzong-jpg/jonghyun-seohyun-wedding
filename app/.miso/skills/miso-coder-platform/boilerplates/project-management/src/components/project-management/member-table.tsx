import { format } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ProjectMember, ProjectTeam } from '@/lib/project-data'

export function MemberTable({ members, teams }: { members: ProjectMember[]; teams: ProjectTeam[] }) {
  return (
    <div className='rounded-md border bg-background'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Teams</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const memberTeams = teams.filter((team) => member.teamKeys.includes(team.key))
            return (
              <TableRow key={member.key}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <Avatar className='size-8'><AvatarFallback>{member.initials}</AvatarFallback></Avatar>
                    <div className='min-w-0'>
                      <div className='truncate font-medium'>{member.name}</div>
                      <div className='truncate text-xs text-muted-foreground'>{member.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant={member.status === 'online' ? 'secondary' : 'outline'}>{member.status}</Badge></TableCell>
                <TableCell>{member.role}</TableCell>
                <TableCell>{member.joinedDate ? format(new Date(member.joinedDate), 'MMM d, yyyy') : '-'}</TableCell>
                <TableCell>
                  <div className='flex flex-wrap gap-1'>
                    {memberTeams.map((team) => <Badge key={team.key} variant='outline' className='rounded-md'>{team.key}</Badge>)}
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
