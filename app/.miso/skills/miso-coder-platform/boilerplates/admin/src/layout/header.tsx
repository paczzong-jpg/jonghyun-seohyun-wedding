import type { ReactNode } from 'react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export function Header({ children, fixed = false }: { children: ReactNode; fixed?: boolean }) {
  return (
    <header className={cn('flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4', fixed && 'sticky top-0 z-30')}>
      <SidebarTrigger className='-ml-1' />
      <Separator orientation='vertical' className='mr-2 h-4' />
      {children}
    </header>
  )
}
