import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Bot, CheckCircle2, Clock, CreditCard, Loader2, MessageSquareText, ServerCog } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Header } from '@/layout/header'
import { Main } from '@/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useTasksQuery } from '@/lib/admin-queries'
import { ACTIVITY_ITEMS, TEAM_MEMBERS } from '@/lib/admin-data'
import { TASK_STATUSES, type AdminTask } from '@/lib/admin-tasks'

const trend = [
  { day: 'Mon', tasks: 42, runs: 28 },
  { day: 'Tue', tasks: 51, runs: 36 },
  { day: 'Wed', tasks: 48, runs: 32 },
  { day: 'Thu', tasks: 63, runs: 44 },
  { day: 'Fri', tasks: 58, runs: 40 },
  { day: 'Sat', tasks: 44, runs: 29 },
  { day: 'Sun', tasks: 69, runs: 51 },
]

function countByStatus(tasks: AdminTask[]) {
  return TASK_STATUSES.map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length,
  }))
}

export function DashboardPage() {
  const tasksQuery = useTasksQuery({})
  const tasks = tasksQuery.data?.items ?? []
  const complete = tasks.filter((task) => task.status === '완료').length
  const inProgress = tasks.filter((task) => task.status === '진행중').length
  const urgent = tasks.filter((task) => task.priority === '긴급' || task.priority === '높음').length
  const revenue = tasks.reduce((sum, task) => sum + task.amount, 0)
  const statusCounts = countByStatus(tasks)

  return (
    <>
      <Header fixed>
        <div className='flex flex-1 items-center justify-between gap-2'>
          <div>
            <h1 className='text-sm font-semibold md:text-base'>Dashboard</h1>
            <p className='text-xs text-muted-foreground'>MISO Coder admin operations</p>
          </div>
          <Button size='sm'>New workflow</Button>
        </div>
      </Header>
      <Main>
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <MetricCard title='Open tasks' value={String(tasks.length)} description='PocketBase admin_tasks' icon={CheckCircle2} trend='12%' positive />
          <MetricCard title='In progress' value={String(inProgress)} description='Owner work in flight' icon={Clock} trend='4%' positive />
          <MetricCard title='Priority queue' value={String(urgent)} description='High or urgent items' icon={ServerCog} trend='3%' />
          <MetricCard title='Tracked amount' value={revenue.toLocaleString('ko-KR')} description='KRW pipeline value' icon={CreditCard} trend='8%' positive />
        </div>

        <div className='grid gap-4 xl:grid-cols-[1.5fr_1fr]'>
          <Card>
            <CardHeader className='flex-row items-center justify-between space-y-0'>
              <div>
                <CardTitle>Runtime activity</CardTitle>
                <CardDescription>Task throughput and agent workflow runs</CardDescription>
              </div>
              {tasksQuery.isFetching ? <Loader2 className='size-4 animate-spin text-muted-foreground' /> : <Badge variant='secondary'>Live</Badge>}
            </CardHeader>
            <CardContent className='h-[300px]'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id='tasks' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='hsl(var(--primary))' stopOpacity={0.35} />
                      <stop offset='95%' stopColor='hsl(var(--primary))' stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id='runs' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='hsl(var(--muted-foreground))' stopOpacity={0.25} />
                      <stop offset='95%' stopColor='hsl(var(--muted-foreground))' stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                  <XAxis dataKey='day' tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type='monotone' dataKey='tasks' stroke='hsl(var(--primary))' fill='url(#tasks)' />
                  <Area type='monotone' dataKey='runs' stroke='hsl(var(--muted-foreground))' fill='url(#runs)' />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operations health</CardTitle>
              <CardDescription>Status distribution from the runtime collection</CardDescription>
            </CardHeader>
            <CardContent className='space-y-5'>
              {statusCounts.map((item) => (
                <div key={item.status} className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span>{item.status}</span>
                    <span className='font-medium'>{item.count}</span>
                  </div>
                  <Progress value={tasks.length ? (item.count / tasks.length) * 100 : 0} />
                </div>
              ))}
              <Separator />
              <div className='grid grid-cols-2 gap-3 text-sm'>
                <div className='rounded-md border p-3'>
                  <div className='text-muted-foreground'>Done</div>
                  <div className='mt-1 text-2xl font-semibold'>{complete}</div>
                </div>
                <div className='rounded-md border p-3'>
                  <div className='text-muted-foreground'>Members</div>
                  <div className='mt-1 text-2xl font-semibold'>{TEAM_MEMBERS.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-4 xl:grid-cols-3'>
          <Card className='xl:col-span-2'>
            <CardHeader>
              <CardTitle>Recent tasks</CardTitle>
              <CardDescription>Latest operational items ready to route</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className='flex items-center justify-between gap-4 rounded-md border p-3'>
                  <div className='min-w-0'>
                    <div className='truncate text-sm font-medium'>{task.name}</div>
                    <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                      <span>{task.owner}</span>
                      <span>{task.category}</span>
                      <span>{task.dueDate}</span>
                    </div>
                  </div>
                  <Badge variant={task.status === '완료' ? 'secondary' : 'outline'}>{task.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Runtime and workspace changes</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {ACTIVITY_ITEMS.map((item) => (
                <div key={item.id} className='flex gap-3'>
                  <div className='flex size-9 items-center justify-center rounded-md border bg-muted'>
                    <item.icon className='size-4' />
                  </div>
                  <div className='space-y-1'>
                    <div className='text-sm font-medium'>{item.title}</div>
                    <div className='text-sm text-muted-foreground'>{item.description}</div>
                  </div>
                </div>
              ))}
              <Separator />
              <div className='flex items-center gap-3 rounded-md border p-3'>
                <Bot className='size-4 text-muted-foreground' />
                <div className='min-w-0 flex-1 text-sm'>Agent handoff queue is healthy.</div>
                <MessageSquareText className='size-4 text-muted-foreground' />
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}

function MetricCard({ title, value, description, icon: Icon, trend, positive = false }: { title: string; value: string; description: string; icon: LucideIcon; trend: string; positive?: boolean }) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight
  return (
    <Card>
      <CardHeader className='flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className='size-4 text-muted-foreground' />
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        <div className='mt-2 flex items-center gap-2 text-xs text-muted-foreground'>
          <span className='inline-flex items-center gap-1 font-medium text-foreground'>
            <TrendIcon className='size-3' />
            {trend}
          </span>
          <span>{description}</span>
        </div>
      </CardContent>
    </Card>
  )
}
