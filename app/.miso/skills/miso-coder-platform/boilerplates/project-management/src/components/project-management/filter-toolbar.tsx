import { Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ISSUE_PRIORITIES, ISSUE_STATUSES, priorityMeta, statusMeta, type ProjectTeam } from '@/lib/project-data'
import { useProjectUi } from '@/lib/project-ui'

export function FilterToolbar({ teams }: { teams: ProjectTeam[] }) {
  const ui = useProjectUi()
  const hasFilter = ui.search || ui.statusFilter !== 'all' || ui.priorityFilter !== 'all' || ui.teamFilter !== 'all'
  return (
    <div className='flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2'>
      <div className='flex h-8 min-w-[220px] flex-1 items-center gap-2 rounded-md border bg-muted/40 px-2 md:hidden'>
        <Search className='size-4 text-muted-foreground' />
        <Input id='project-issue-search' name='project-issue-search' value={ui.search} onChange={(event) => ui.setSearch(event.target.value)} placeholder='Search issues...' className='h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0' />
      </div>
      <Select value={ui.statusFilter} onValueChange={(value) => ui.setStatusFilter(value as typeof ui.statusFilter)}>
        <SelectTrigger className='h-8 w-[150px]'><SelectValue placeholder='Status' /></SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All statuses</SelectItem>
          {ISSUE_STATUSES.map((status) => <SelectItem key={status} value={status}>{statusMeta[status].label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={ui.priorityFilter} onValueChange={(value) => ui.setPriorityFilter(value as typeof ui.priorityFilter)}>
        <SelectTrigger className='h-8 w-[150px]'><SelectValue placeholder='Priority' /></SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All priorities</SelectItem>
          {ISSUE_PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{priorityMeta[priority].label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={ui.teamFilter} onValueChange={ui.setTeamFilter}>
        <SelectTrigger className='h-8 w-[150px]'><SelectValue placeholder='Team' /></SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All teams</SelectItem>
          {teams.map((team) => <SelectItem key={team.key} value={team.key}>{team.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {hasFilter ? (
        <Button variant='ghost' size='sm' onClick={() => {
          ui.setSearch('')
          ui.setStatusFilter('all')
          ui.setPriorityFilter('all')
          ui.setTeamFilter('all')
        }}>
          <X className='mr-2 size-4' />
          Reset
        </Button>
      ) : (
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <Filter className='size-3' />
          Synced filters
        </div>
      )}
    </div>
  )
}
