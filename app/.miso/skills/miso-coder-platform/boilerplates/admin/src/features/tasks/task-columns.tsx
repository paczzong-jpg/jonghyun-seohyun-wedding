import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { LongText } from '@/components/long-text'
import type { AdminTask } from '@/lib/admin-tasks'

type ColumnActions = {
  onEdit: (task: AdminTask) => void
  onDelete: (task: AdminTask) => void
}

const statusVariant = {
  대기: 'outline',
  진행중: 'default',
  완료: 'secondary',
  보류: 'outline',
} as const

export function getTaskColumns({ onEdit, onDelete }: ColumnActions): ColumnDef<AdminTask>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          aria-label='Select all'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          aria-label='Select row'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Task' />,
      cell: ({ row }) => (
        <div className='min-w-[240px]'>
          <LongText className='font-medium'>{row.original.name}</LongText>
          <div className='text-xs text-muted-foreground'>{row.original.memo || 'No memo'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Category' />,
      filterFn: (row, id, value) => Array.isArray(value) && value.includes(row.getValue(id)),
      cell: ({ row }) => <Badge variant='outline'>{row.original.category}</Badge>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
      filterFn: (row, id, value) => Array.isArray(value) && value.includes(row.getValue(id)),
      cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>,
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Priority' />,
      filterFn: (row, id, value) => Array.isArray(value) && value.includes(row.getValue(id)),
      cell: ({ row }) => <span className='text-sm'>{row.original.priority}</span>,
    },
    {
      accessorKey: 'owner',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Owner' />,
      filterFn: (row, id, value) => Array.isArray(value) && value.includes(row.getValue(id)),
      cell: ({ row }) => <span className='text-sm font-medium'>{row.original.owner}</span>,
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Amount' />,
      cell: ({ row }) => <span className='tabular-nums'>{row.original.amount.toLocaleString('ko-KR')}</span>,
    },
    {
      accessorKey: 'dueDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Due' />,
      cell: ({ row }) => <span className='text-sm text-muted-foreground'>{row.original.dueDate}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon'><MoreHorizontal className='size-4' /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => onEdit(row.original)}><Pencil className='mr-2 size-4' />Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(row.original)}><Trash2 className='mr-2 size-4' />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
