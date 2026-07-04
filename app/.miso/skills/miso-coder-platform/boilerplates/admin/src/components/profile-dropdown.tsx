import { useState } from 'react'
import { LogOut, Settings, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { sidebarData } from '@/lib/admin-data'

export function ProfileDropdown() {
  const user = sidebarData.user
  const [signOutOpen, setSignOutOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative size-8 rounded-full'>
            <Avatar className='size-8'><AvatarFallback>YO</AvatarFallback></Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuLabel>
            <div className='flex flex-col gap-1'>
              <span className='text-sm font-medium'>{user.name}</span>
              <span className='text-xs text-muted-foreground'>{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem><User className='mr-2 size-4' />Profile</DropdownMenuItem>
          <DropdownMenuItem><Settings className='mr-2 size-4' />Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSignOutOpen(true)}><LogOut className='mr-2 size-4' />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  )
}
