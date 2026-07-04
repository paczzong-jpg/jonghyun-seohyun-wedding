import type { Table } from '@tanstack/react-table'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function DataTableViewOptions<TData>({ table }: { table: Table<TData> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant='outline' size='sm' className='ml-auto hidden h-8 lg:flex'><SlidersHorizontal className='mr-2 size-4' />View</Button></DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[150px]'>
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table.getAllColumns().filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide()).map((column) => (
          <DropdownMenuCheckboxItem key={column.id} className='capitalize' checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}>{column.id}</DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
