import { SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Search({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <Button
      type='button'
      variant='outline'
      className={cn('relative h-8 w-full justify-start gap-2 rounded-md text-muted-foreground sm:w-64', className)}
      onClick={onOpen}
    >
      <SearchIcon className='size-4' />
      <span className='hidden sm:inline-flex'>Search command...</span>
      <span className='ml-auto hidden text-xs tracking-widest sm:inline-flex'>⌘K</span>
    </Button>
  )
}
