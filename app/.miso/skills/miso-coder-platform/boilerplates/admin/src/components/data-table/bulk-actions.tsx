import type { ReactNode } from 'react'
import type { Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type Props<TData> = {
  table: Table<TData>
  entityName: string
  children: ReactNode
}

export function DataTableBulkActions<TData>({ table, entityName, children }: Props<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  if (selectedCount === 0) return null

  return (
    <div
      role='toolbar'
      aria-label={'Selected ' + entityName + ' actions'}
      className='fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-[720px] items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 shadow-lg md:static md:max-w-none md:shadow-none'
    >
      <div className='flex min-w-0 items-center gap-2 text-sm'>
        <span className='truncate font-medium'>{selectedCount} {entityName}{selectedCount > 1 ? 's' : ''} selected</span>
        <Separator orientation='vertical' className='hidden h-5 sm:block' />
        <Button variant='ghost' size='sm' className='h-8 px-2' onClick={() => table.resetRowSelection()}>
          Clear
          <X className='ml-1 size-4' />
        </Button>
      </div>
      <div className='flex shrink-0 items-center gap-2'>{children}</div>
    </div>
  )
}
