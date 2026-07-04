import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LearnMore({ href, children = 'Learn more' }: { href: string; children?: string }) {
  return (
    <Button asChild variant='link' className='h-auto p-0'>
      <a href={href} target='_blank' rel='noreferrer'>
        {children}
        <ExternalLink className='ml-1 size-3' />
      </a>
    </Button>
  )
}
