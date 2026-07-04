import { Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function ComingSoon({ title = 'Coming soon', description = 'This section is intentionally staged for the next workflow.' }: { title?: string; description?: string }) {
  return (
    <Card>
      <CardContent className='flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center'>
        <div className='flex size-12 items-center justify-center rounded-md border bg-muted'>
          <Construction className='size-6 text-muted-foreground' />
        </div>
        <div className='space-y-1'>
          <h2 className='text-xl font-semibold tracking-tight'>{title}</h2>
          <p className='max-w-md text-sm text-muted-foreground'>{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
