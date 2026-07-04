import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

const settings = [
  ['Runtime failures', 'Notify when PocketBase hooks or preview builds fail.'],
  ['Queued approvals', 'Notify when an agent handoff waits for user approval.'],
  ['Publish complete', 'Notify when a generated site finishes publishing.'],
]

export function NotificationsSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Operational signals surfaced to the admin team.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-3'>
        {settings.map(([title, description]) => (
          <div key={title} className='flex items-center justify-between rounded-md border p-4'>
            <div>
              <div className='font-medium'>{title}</div>
              <div className='text-sm text-muted-foreground'>{description}</div>
            </div>
            <Switch defaultChecked={title !== 'Publish complete'} />
          </div>
        ))}
      </CardContent>
      <CardFooter><Button onClick={() => toast.success('Notification settings saved locally')}><Bell className='mr-2 size-4' />Save notifications</Button></CardFooter>
    </Card>
  )
}
