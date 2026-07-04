import { ChevronsUpDown, CircleDot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function WorkspaceSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-11 w-full justify-between px-2'>
          <span className='flex min-w-0 items-center gap-2'>
            <span className='flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground'>M</span>
            <span className='min-w-0 text-left'>
              <span className='block truncate text-sm font-semibold'>MISO Workspace</span>
              <span className='block truncate text-xs text-muted-foreground'>Project management</span>
            </span>
          </span>
          <ChevronsUpDown className='size-4 text-muted-foreground' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-64' align='start'>
        <DropdownMenuLabel>Workspace</DropdownMenuLabel>
        <DropdownMenuItem><CircleDot className='mr-2 size-4' />MISO Workspace</DropdownMenuItem>
        <DropdownMenuItem><CircleDot className='mr-2 size-4' />Generated Apps</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Create workspace</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
