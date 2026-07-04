import { Activity, ExternalLink, MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/layout/header'
import { Main } from '@/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ADMIN_APPS } from '@/lib/admin-data'

export function AppsPage() {
  return (
    <>
      <Header fixed>
        <div className='flex flex-1 items-center justify-between gap-2'>
          <div>
            <h1 className='text-sm font-semibold md:text-base'>Apps</h1>
            <p className='text-xs text-muted-foreground'>Generated apps, integrations, and runtime surfaces</p>
          </div>
          <Button size='sm' onClick={() => toast.success('Create app action ready for your runtime API')}><Plus className='mr-2 size-4' />Create app</Button>
        </div>
      </Header>
      <Main>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {ADMIN_APPS.map((app) => (
            <Card key={app.id}>
              <CardHeader className='space-y-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <CardTitle className='text-base'>{app.name}</CardTitle>
                    <CardDescription>{app.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant='ghost' size='icon'><MoreHorizontal className='size-4' /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem onClick={() => toast.success('Open preview action selected')}><ExternalLink className='mr-2 size-4' />Open preview</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Runtime logs action selected')}>Runtime logs</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary'>{app.type}</Badge>
                  <Badge variant={app.status === 'Live' ? 'default' : 'outline'}>{app.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className='flex items-center justify-between text-sm text-muted-foreground'>
                <span>Owner: {app.owner}</span>
                <span className='inline-flex items-center gap-1'><Activity className='size-3' />Healthy</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </Main>
    </>
  )
}
