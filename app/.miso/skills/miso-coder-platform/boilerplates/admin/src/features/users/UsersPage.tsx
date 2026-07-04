import { MailPlus, UserPlus } from 'lucide-react'
import { Header } from '@/layout/header'
import { Main } from '@/layout/main'
import { Button } from '@/components/ui/button'
import { UserDialogs } from '@/features/users/UserDialogs'
import { UsersProvider, useUsers } from '@/features/users/users-context'
import { UsersTable } from '@/features/users/UsersTable'

export function UsersPage() {
  return (
    <UsersProvider>
      <UsersPageContent />
      <UserDialogs />
    </UsersProvider>
  )
}

function UsersPageContent() {
  const { setOpen } = useUsers()
  return (
    <>
      <Header fixed>
        <div className='flex flex-1 items-center justify-between gap-2'>
          <div>
            <h1 className='text-sm font-semibold md:text-base'>Users</h1>
            <p className='text-xs text-muted-foreground'>Workspace members, roles, invitations, and admin permissions</p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' onClick={() => setOpen('invite')}><MailPlus className='mr-2 size-4' />Invite</Button>
            <Button size='sm' onClick={() => setOpen('create')}><UserPlus className='mr-2 size-4' />Add user</Button>
          </div>
        </div>
      </Header>
      <Main><UsersTable /></Main>
    </>
  )
}
