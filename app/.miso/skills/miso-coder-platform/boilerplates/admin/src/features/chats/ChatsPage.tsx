import { Bot, CircleDot, MessageSquareText, SendHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/layout/header'
import { Main } from '@/layout/main'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { CHAT_THREADS } from '@/lib/admin-data'

export function ChatsPage() {
  const active = CHAT_THREADS[0]
  return (
    <>
      <Header fixed>
        <div className='flex flex-1 items-center justify-between gap-2'>
          <div>
            <h1 className='text-sm font-semibold md:text-base'>Chats</h1>
            <p className='text-xs text-muted-foreground'>Agent, chatflow, and tool conversation queues</p>
          </div>
          <Button size='sm' onClick={() => toast.success('New chat action ready for your conversation API')}><MessageSquareText className='mr-2 size-4' />New chat</Button>
        </div>
      </Header>
      <Main>
        <div className='grid min-h-[620px] gap-4 lg:grid-cols-[360px_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>Conversation isolation and model routing preview.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-2'>
              {CHAT_THREADS.map((thread) => (
                <button key={thread.id} className='w-full rounded-md border p-3 text-left transition-colors hover:bg-muted'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-medium'>{thread.title}</div>
                      <div className='truncate text-sm text-muted-foreground'>{thread.lastMessage}</div>
                    </div>
                    <span className='text-xs text-muted-foreground'>{thread.time}</span>
                  </div>
                  <div className='mt-3 flex items-center justify-between'>
                    <Badge variant='outline'>{thread.model}</Badge>
                    {thread.unread > 0 ? <Badge>{thread.unread}</Badge> : <CircleDot className='size-3 text-muted-foreground' />}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
          <Card className='flex min-h-0 flex-col'>
            <CardHeader className='flex-row items-center gap-3 space-y-0 border-b'>
              <Avatar><AvatarFallback>{active.author.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              <div className='min-w-0 flex-1'>
                <CardTitle className='truncate text-base'>{active.title}</CardTitle>
                <CardDescription>Assigned to {active.author} through {active.model}</CardDescription>
              </div>
              <Badge variant='secondary'><Bot className='mr-1 size-3' />Agent ready</Badge>
            </CardHeader>
            <CardContent className='flex flex-1 flex-col gap-4 p-4'>
              <div className='flex-1 space-y-4'>
                <Message bubble='left' author={active.author} body={active.lastMessage} />
                <Message bubble='right' author='MISO Admin' body='I will check the runtime preview, latest deploy status, and PocketBase records before replying.' />
                <Message bubble='left' author='Agent' body='Verified preview is available. No stale owner mapping found for this app.' />
              </div>
              <Separator />
              <div className='flex gap-2'>
                <Input placeholder='Reply to this isolated conversation...' />
                <Button size='icon' onClick={() => toast.success('Reply queued')}><SendHorizontal className='size-4' /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}

function Message({ bubble, author, body }: { bubble: 'left' | 'right'; author: string; body: string }) {
  return (
    <div className={bubble === 'right' ? 'flex justify-end' : 'flex justify-start'}>
      <div className='max-w-[75%] rounded-md border bg-card p-3 shadow-sm'>
        <div className='mb-1 text-xs font-medium text-muted-foreground'>{author}</div>
        <div className='text-sm'>{body}</div>
      </div>
    </div>
  )
}
