import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function LongText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('line-clamp-2 max-w-[32rem] text-sm', className)}>{children}</span>
}
