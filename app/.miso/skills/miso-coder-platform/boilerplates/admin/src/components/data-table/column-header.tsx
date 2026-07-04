import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function DataTableColumnHeader<TData, TValue>({ column, title, className }: { column: Column<TData, TValue>; title: string; className?: string }) {
  if (!column.getCanSort()) return <div className={cn(className)}>{title}</div>
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='sm' className='-ml-3 h-8 data-[state=open]:bg-accent'>
            <span>{title}</span>
            {column.getIsSorted() === 'desc' ? <ArrowDown className='ml-2 size-4' /> : column.getIsSorted() === 'asc' ? <ArrowUp className='ml-2 size-4' /> : <ChevronsUpDown className='ml-2 size-4' />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start'>
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}><ArrowUp className='mr-2 size-4' />Asc</DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}><ArrowDown className='mr-2 size-4' />Desc</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}><EyeOff className='mr-2 size-4' />Hide</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
