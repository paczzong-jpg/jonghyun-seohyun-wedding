import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { ProjectPageProps } from '@/pages/page-types'

export function SettingsPage({ data }: ProjectPageProps) {
  return (
    <div className='grid gap-4 p-4 xl:grid-cols-[1fr_0.8fr]'>
      <Card>
        <CardHeader>
          <CardTitle>Workspace settings</CardTitle>
          <CardDescription>Generated apps can wire these fields to MISO auth or PocketBase auth later.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='workspace-name'>Workspace name</Label>
            <Input id='workspace-name' defaultValue='MISO Workspace' />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='issue-prefix'>Issue prefix</Label>
            <Input id='issue-prefix' defaultValue='MISO' />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='default-team'>Default team</Label>
            <Select defaultValue={data.teams[0]?.key || 'PRODUCT'}>
              <SelectTrigger id='default-team'><SelectValue /></SelectTrigger>
              <SelectContent>{data.teams.map((team) => <SelectItem key={team.key} value={team.key}>{team.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className='flex items-center justify-between rounded-md border p-3 sm:col-span-2'>
            <div>
              <div className='font-medium'>Public issue browsing</div>
              <div className='text-sm text-muted-foreground'>Keep off when this app is used as an internal operator workspace.</div>
            </div>
            <Switch />
          </div>
        </CardContent>
        <CardFooter><Button><Save className='mr-2 size-4' />Save settings</Button></CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Runtime model</CardTitle>
          <CardDescription>Collections created by the setup script.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 text-sm'>
          {['pm_issues', 'pm_projects', 'pm_teams', 'pm_members', 'pm_inbox'].map((name) => (
            <div key={name} className='flex items-center justify-between rounded-md border px-3 py-2'>
              <span className='font-mono text-xs'>{name}</span>
              <span className='text-muted-foreground'>PocketBase</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
