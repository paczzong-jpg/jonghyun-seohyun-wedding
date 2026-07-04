import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function ErrorPage({ code, title, description }: { code: string; title: string; description: string }) {
  return (
    <main className='grid min-h-screen place-items-center bg-muted/40 p-4'>
      <Card className='w-full max-w-lg'>
        <CardContent className='space-y-6 p-8 text-center'>
          <div className='mx-auto flex size-12 items-center justify-center rounded-md border bg-background'>
            <AlertTriangle className='size-6' />
          </div>
          <div className='space-y-2'>
            <div className='text-sm font-medium text-muted-foreground'>{code}</div>
            <h1 className='text-3xl font-bold tracking-tight'>{title}</h1>
            <p className='text-muted-foreground'>{description}</p>
          </div>
          <Button asChild><Link to='/'><ArrowLeft className='mr-2 size-4' />Back to dashboard</Link></Button>
        </CardContent>
      </Card>
    </main>
  )
}
