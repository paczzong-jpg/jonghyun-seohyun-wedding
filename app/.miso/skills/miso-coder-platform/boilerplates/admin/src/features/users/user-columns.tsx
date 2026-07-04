import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { LongText } from '@/components/long-text'
import type { AdminUser } from '@/lib/admin-users'

type ColumnActions = {
  onEdit: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
}

const statusVariant = {
  active: 'secondary',
  inactive: 'outline',
  invited: 'default',
  suspended: 'destructive',
} as const

const roleLabel = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Viewer',
} as const

function initials(user: AdminUser) {
  return (user.firstName.slice(0, 1) + user.lastName.slice(0, 1)).toUpperCase() || user.username.slice(0, 2).toUpperCase()
}

export function getUserColumns({ onEdit, onDelete }: ColumnActions): ColumnDef<AdminUser>[] {
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
      accessorKey: 'username',
      header: ({ column }) => <DataTableColumnHeader column={column} title='User' />,
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className='flex min-w-[260px] items-center gap-3'>
            <Avatar className='size-9'>
              <AvatarFallback>{initials(user)}</AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <LongText className='font-medium'>{user.firstName} {user.lastName}</LongText>
              <div className='truncate text-sm text-muted-foreground'>{user.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'department',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Department' />,
      filterFn: (row, id, value) => Array.isArray(value) && value.includes(row.getValue(id)),
      cell: ({ row }) => <Badge variant='outline'>{row.original.department}</Badge>,
    },
    {
      accessorKey: 'role',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Role' />,
      filterFn: (row, id, value) => Array.isArray(value) && value.includes(row.getValue(id)),
      cell: ({ row }) => <Badge variant='outline'><ShieldCheck className='mr-1 size-3' />{roleLabel[row.original.role]}</Badge>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
      filterFn: (row, id, value) => Array.isArray(value) && value.includes(row.getValue(id)),
      cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>,
    },
    {
      accessorKey: 'phoneNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Phone' />,
      cell: ({ row }) => <span className='text-sm text-muted-foreground'>{row.original.phoneNumber || '-'}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon' aria-label='Open user actions'>
              <MoreHorizontal className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className='mr-2 size-4' />
              Edit user
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className='text-destructive' onClick={() => onDelete(row.original)}>
              <Trash2 className='mr-2 size-4' />
              Delete user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
