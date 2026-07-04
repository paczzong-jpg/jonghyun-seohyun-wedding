import { Plus } from 'lucide-react'
import { Header } from '@/layout/header'
import { Main } from '@/layout/main'
import { Button } from '@/components/ui/button'
import { TaskDialogs } from '@/features/tasks/TaskDialogs'
import { TasksProvider, useTasks } from '@/features/tasks/tasks-context'
import { TasksTable } from '@/features/tasks/TasksTable'

export function TasksPage() {
  return (
    <TasksProvider>
      <TasksPageContent />
      <TaskDialogs />
    </TasksProvider>
  )
}

function TasksPageContent() {
  const { setOpen } = useTasks()
  return (
    <>
      <Header fixed>
        <div className='flex flex-1 items-center justify-between gap-2'>
          <div>
            <h1 className='text-sm font-semibold md:text-base'>Tasks</h1>
            <p className='text-xs text-muted-foreground'>PocketBase CRUD with TanStack Query and Table</p>
          </div>
          <Button size='sm' onClick={() => setOpen('create')}><Plus className='mr-2 size-4' />New task</Button>
        </div>
      </Header>
      <Main><TasksTable /></Main>
    </>
  )
}
