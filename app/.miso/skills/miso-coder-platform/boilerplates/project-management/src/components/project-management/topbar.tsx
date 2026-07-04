import { Menu, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ProjectSidebar } from '@/components/project-management/sidebar'
import type { ProjectTeam } from '@/lib/project-data'

export function ProjectTopbar({ title, description, teams, unreadCount, search, onSearch, onCreateIssue }: { title: string; description: string; teams: ProjectTeam[]; unreadCount: number; search: string; onSearch: (value: string) => void; onCreateIssue: () => void }) {
  return (
    <header className='flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4'>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant='ghost' size='icon' className='lg:hidden'><Menu className='size-4' /></Button>
        </SheetTrigger>
        <SheetContent side='left' className='w-[290px] p-0'>
          <SheetHeader><SheetTitle className='sr-only'>Project navigation</SheetTitle></SheetHeader>
          <ProjectSidebar teams={teams} unreadCount={unreadCount} mobile />
        </SheetContent>
      </Sheet>
      <div className='min-w-0 flex-1'>
        <h1 className='truncate text-sm font-semibold md:text-base'>{title}</h1>
        <p className='hidden truncate text-xs text-muted-foreground sm:block'>{description}</p>
      </div>
      <div className='hidden w-[280px] items-center gap-2 rounded-md border bg-muted/40 px-2 md:flex'>
        <Search className='size-4 text-muted-foreground' />
        <Input id='project-global-search' name='project-global-search' value={search} onChange={(event) => onSearch(event.target.value)} placeholder='Search issues, projects, teams...' className='h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0' />
      </div>
      <Button size='sm' onClick={onCreateIssue}><Plus className='mr-2 size-4' />Issue</Button>
      <Button variant='outline' size='sm' asChild><Link to='/projects'>Roadmap</Link></Button>
    </header>
  )
}
