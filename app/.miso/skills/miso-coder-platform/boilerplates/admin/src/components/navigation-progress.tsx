import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function NavigationProgress() {
  const location = useLocation()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(true)
    const timeout = window.setTimeout(() => setActive(false), 220)
    return () => window.clearTimeout(timeout)
  }, [location.key, location.pathname, location.search])

  return (
    <div
      aria-hidden
      className={cn('fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary transition-transform duration-300', active ? 'scale-x-100' : 'scale-x-0')}
    />
  )
}
