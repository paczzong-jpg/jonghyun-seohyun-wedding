import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { Loader2, Mail, Trash2, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTableBulkActions, DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { useUsers } from '@/features/users/users-context'
import { getUserColumns } from '@/features/users/user-columns'
import { useUpdateUsersStatusMutation, useUsersQuery } from '@/lib/admin-queries'
import { USER_DEPARTMENTS, USER_ROLES, USER_STATUSES, type AdminUser, type UserStatus } from '@/lib/admin-users'

const filterColumns = [
  { id: 'status', title: 'Status', options: USER_STATUSES.map((value) => ({ label: value, value })) },
  { id: 'role', title: 'Role', options: USER_ROLES.map((value) => ({ label: value, value })) },
  { id: 'department', title: 'Department', options: USER_DEPARTMENTS.map((value) => ({ label: value, value })) },
]

export function UsersTable() {
  const usersQuery = useUsersQuery({})
  const updateStatus = useUpdateUsersStatusMutation()
  const { setOpen, setCurrentUser, setBulkUserIds } = useUsers()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const data = usersQuery.data?.items ?? []
  const columns = useMemo(() => getUserColumns({
    onEdit: (user) => {
      setCurrentUser(user)
      setOpen('edit')
    },
    onDelete: (user) => {
      setCurrentUser(user)
      setOpen('delete')
    },
  }), [setCurrentUser, setOpen])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, globalFilter },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, value) => {
      const user = row.original as AdminUser
      const haystack = [user.firstName, user.lastName, user.username, user.email, user.department].join(' ').toLowerCase()
      return haystack.includes(String(value).toLowerCase())
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const selectedUsers = table.getFilteredSelectedRowModel().rows.map((row) => row.original)

  async function setSelectedStatus(status: UserStatus) {
    const ids = selectedUsers.map((user) => user.id)
    await updateStatus.mutateAsync({ ids, status })
    toast.success('Updated ' + ids.length + ' user status')
    table.resetRowSelection()
  }

  function bulkDelete() {
    setBulkUserIds(selectedUsers.map((user) => user.id))
    setOpen('bulk-delete')
  }

  return (
    <Card>
      <CardHeader className='gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <CardTitle>Team members</CardTitle>
          <CardDescription>PocketBase-backed users table with invite, role, status, row actions, and bulk actions.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <DataTableToolbar table={table} searchPlaceholder='Search users...' filterColumns={filterColumns} />
        <div className='overflow-hidden rounded-md border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                <TableRow><TableCell colSpan={columns.length} className='h-28 text-center'><Loader2 className='mx-auto size-5 animate-spin text-muted-foreground' /></TableCell></TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                    {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={columns.length} className='h-24 text-center'>No users found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
        <DataTableBulkActions table={table} entityName='user'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline' size='icon' className='size-8' onClick={() => toast.success('Invite reminder queued for ' + selectedUsers.length + ' users')}>
                <Mail className='size-4' />
                <span className='sr-only'>Invite selected users</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Invite selected users</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline' size='icon' className='size-8' disabled={updateStatus.isPending} onClick={() => setSelectedStatus('active')}>
                <UserCheck className='size-4' />
                <span className='sr-only'>Activate selected users</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Activate selected users</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline' size='icon' className='size-8' disabled={updateStatus.isPending} onClick={() => setSelectedStatus('inactive')}>
                <UserX className='size-4' />
                <span className='sr-only'>Deactivate selected users</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Deactivate selected users</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='destructive' size='icon' className='size-8' onClick={bulkDelete}>
                <Trash2 className='size-4' />
                <span className='sr-only'>Delete selected users</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete selected users</TooltipContent>
          </Tooltip>
        </DataTableBulkActions>
      </CardContent>
    </Card>
  )
}
