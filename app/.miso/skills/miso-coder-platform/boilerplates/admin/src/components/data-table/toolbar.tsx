import type { Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from '@/components/data-table/faceted-filter'
import { DataTableViewOptions } from '@/components/data-table/view-options'

type Option = { label: string; value: string }

type Props<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  filterColumns?: Array<{ id: string; title: string; options: Option[] }>
}

export function DataTableToolbar<TData>({ table, searchPlaceholder = 'Filter rows...', filterColumns = [] }: Props<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || Boolean(table.getState().globalFilter)
  return (
    <div className='flex items-center justify-between gap-2'>
      <div className='flex flex-1 flex-wrap items-center gap-2'>
        <Input placeholder={searchPlaceholder} value={(table.getState().globalFilter as string) || ''} onChange={(event) => table.setGlobalFilter(event.target.value)} className='h-8 w-[180px] lg:w-[280px]' />
        {filterColumns.map((item) => <DataTableFacetedFilter key={item.id} column={table.getColumn(item.id)} title={item.title} options={item.options} />)}
        {isFiltered && <Button variant='ghost' size='sm' onClick={() => { table.resetColumnFilters(); table.setGlobalFilter('') }} className='h-8 px-2 lg:px-3'>Reset<X className='ml-2 size-4' /></Button>}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
