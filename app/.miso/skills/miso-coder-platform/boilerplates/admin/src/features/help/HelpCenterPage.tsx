import { BookOpen, CircleHelp, LifeBuoy, Mail, MessageSquareText, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/layout/header'
import { Main } from '@/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LearnMore } from '@/components/learn-more'

const articles = [
  { title: 'PocketBase collection rules', category: 'Runtime', description: 'When to keep public rules and when to combine MISO auth or PB auth.' },
  { title: 'CSV import and export', category: 'Data', description: 'Validate headers, preserve Korean text with UTF-8 BOM, and keep partial failures visible.' },
  { title: 'Admin user permissions', category: 'Security', description: 'Use role/status changes before destructive deletion whenever records need auditability.' },
  { title: 'External API credentials', category: 'Integrations', description: 'Keep provider secrets server-side and call external APIs through PB routes.' },
]

export function HelpCenterPage() {
  return (
    <>
      <Header fixed>
        <div>
          <h1 className='text-sm font-semibold md:text-base'>Help Center</h1>
          <p className='text-xs text-muted-foreground'>Operational guidance for generated admin apps</p>
        </div>
      </Header>
      <Main>
        <section className='space-y-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
            <div className='space-y-1'>
              <h2 className='text-2xl font-bold tracking-tight'>Help Center</h2>
              <p className='text-muted-foreground'>Search operational recipes and common admin app decisions.</p>
            </div>
            <Button variant='outline' onClick={() => toast.success('Support request action ready')}><LifeBuoy className='mr-2 size-4' />Contact support</Button>
          </div>
          <div className='relative max-w-xl'>
            <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input className='pl-9' placeholder='Search admin operations, runtime, permissions...' />
          </div>
        </section>

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {articles.map((article) => (
            <Card key={article.title}>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <Badge variant='outline'>{article.category}</Badge>
                  <BookOpen className='size-4 text-muted-foreground' />
                </div>
                <CardTitle className='text-base'>{article.title}</CardTitle>
                <CardDescription>{article.description}</CardDescription>
              </CardHeader>
              <CardContent><LearnMore href='https://github.com/satnaing/shadcn-admin'>Reference pattern</LearnMore></CardContent>
            </Card>
          ))}
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'><CircleHelp className='size-4' />Implementation checklist</CardTitle>
              <CardDescription>Use this page as a real route, not a 503 placeholder.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-2 text-sm text-muted-foreground'>
              <p>Keep CRUD screens PB-backed or clearly mark them as static examples.</p>
              <p>Wire MISO auth, PB auth, or customer SSO before locking PocketBase rules.</p>
              <p>Preserve empty, loading, error, and destructive-confirm states for every menu.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'><MessageSquareText className='size-4' />Support channels</CardTitle>
              <CardDescription>Replace these examples with your customer support routes.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-2 text-sm'>
              <Button variant='outline' className='justify-start' onClick={() => toast.success('Email channel selected')}><Mail className='mr-2 size-4' />support@miso.local</Button>
              <Button variant='outline' className='justify-start' onClick={() => toast.success('Operator chat selected')}><MessageSquareText className='mr-2 size-4' />Open operator chat</Button>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
