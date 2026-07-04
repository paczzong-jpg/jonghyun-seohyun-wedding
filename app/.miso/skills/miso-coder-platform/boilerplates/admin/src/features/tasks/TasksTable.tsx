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
import { ArrowUpDown, CircleArrowUp, Download, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTableBulkActions, DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { useTasks } from '@/features/tasks/tasks-context'
import { getTaskColumns } from '@/features/tasks/task-columns'
import { useTasksQuery, useUpdateTasksPriorityMutation, useUpdateTasksStatusMutation } from '@/lib/admin-queries'
import { exportToCsv } from '@/lib/csv'
import { TASK_CATEGORIES, TASK_OWNERS, TASK_PRIORITIES, TASK_STATUSES, type AdminTask, type TaskPriority, type TaskStatus } from '@/lib/admin-tasks'

const filterColumns = [
  { id: 'status', title: 'Status', options: TASK_STATUSES.map((value) => ({ label: value, value })) },
  { id: 'category', title: 'Category', options: TASK_CATEGORIES.map((value) => ({ label: value, value })) },
  { id: 'priority', title: 'Priority', options: TASK_PRIORITIES.map((value) => ({ label: value, value })) },
  { id: 'owner', title: 'Owner', options: TASK_OWNERS.map((value) => ({ label: value, value })) },
]

export function TasksTable() {
  const tasksQuery = useTasksQuery({})
  const updateStatus = useUpdateTasksStatusMutation()
  const updatePriority = useUpdateTasksPriorityMutation()
  const { setOpen, setCurrentTask, setBulkTaskIds } = useTasks()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const data = tasksQuery.data?.items ?? []
  const columns = useMemo(() => getTaskColumns({
    onEdit: (task) => {
      setCurrentTask(task)
      setOpen('edit')
    },
    onDelete: (task) => {
      setCurrentTask(task)
      setOpen('delete')
    },
  }), [setCurrentTask, setOpen])

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
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const selectedTasks = table.getFilteredSelectedRowModel().rows.map((row) => row.original)

  function exportRows(rows: AdminTask[]) {
    exportToCsv('admin-tasks.csv', rows.map((task) => ({
      업무명: task.name,
      구분: task.category,
      상태: task.status,
      우선순위: task.priority,
      담당자: task.owner,
      '마감일': task.dueDate,
      '금액(원)': task.amount,
      메모: task.memo,
      등록일: task.created,
    })))
  }

  async function updateSelectedStatus(status: TaskStatus) {
    const ids = selectedTasks.map((task) => task.id)
    await updateStatus.mutateAsync({ ids, status })
    toast.success('Updated ' + ids.length + ' task status')
    table.resetRowSelection()
  }

  async function updateSelectedPriority(priority: TaskPriority) {
    const ids = selectedTasks.map((task) => task.id)
    await updatePriority.mutateAsync({ ids, priority })
    toast.success('Updated ' + ids.length + ' task priority')
    table.resetRowSelection()
  }

  function bulkDelete() {
    setBulkTaskIds(selectedTasks.map((task) => task.id))
    setOpen('bulk-delete')
  }

  return (
    <Card>
      <CardHeader className='gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>TanStack Table over PocketBase admin_tasks records.</CardDescription>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' size='sm' onClick={() => setOpen('import')}><Upload className='mr-2 size-4' />Import</Button>
          <Button variant='outline' size='sm' onClick={() => exportRows(selectedTasks.length ? selectedTasks : data)}><Download className='mr-2 size-4' />Export</Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <DataTableToolbar table={table} searchPlaceholder='Search task, memo, owner...' filterColumns={filterColumns} />
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {tasksQuery.isLoading ? (
                <TableRow><TableCell colSpan={columns.length} className='h-28 text-center'><Loader2 className='mx-auto size-5 animate-spin text-muted-foreground' /></TableCell></TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                    {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={columns.length} className='h-24 text-center'>No results.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
        <DataTableBulkActions table={table} entityName='task'>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='icon' className='size-8' aria-label='Update selected task status'>
                    <CircleArrowUp className='size-4' />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Update status</TooltipContent>
            </Tooltip>
            <DropdownMenuContent sideOffset={12}>
              {TASK_STATUSES.map((status) => (
                <DropdownMenuItem key={status} onClick={() => updateSelectedStatus(status)}>
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='icon' className='size-8' aria-label='Update selected task priority'>
                    <ArrowUpDown className='size-4' />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Update priority</TooltipContent>
            </Tooltip>
            <DropdownMenuContent sideOffset={12}>
              {TASK_PRIORITIES.map((priority) => (
                <DropdownMenuItem key={priority} onClick={() => updateSelectedPriority(priority)}>
                  {priority}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline' size='icon' className='size-8' onClick={() => exportRows(selectedTasks)}>
                <Download className='size-4' />
                <span className='sr-only'>Export selected tasks</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export selected tasks</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='destructive' size='icon' className='size-8' onClick={bulkDelete}>
                <Trash2 className='size-4' />
                <span className='sr-only'>Delete selected tasks</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete selected tasks</TooltipContent>
          </Tooltip>
        </DataTableBulkActions>
      </CardContent>
    </Card>
  )
}
