import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Main({ children, className }: { children: ReactNode; className?: string }) {
  return <main id='main-content' className={cn('flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6', className)}>{children}</main>
}
