import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function AccountSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Login and security defaults for a generated admin app.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-5'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='account-email'>Login email</Label>
            <Input id='account-email' defaultValue='young@miso.local' />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='account-role'>Default role</Label>
            <Input id='account-role' defaultValue='Owner' />
          </div>
        </div>
        <div className='flex items-center justify-between rounded-md border p-4'>
          <div>
            <div className='font-medium'>Require MISO login</div>
            <div className='text-sm text-muted-foreground'>Use the platform auth recipe when the app is not public.</div>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
      <CardFooter><Button onClick={() => toast.success('Account settings saved locally')}><ShieldCheck className='mr-2 size-4' />Update account</Button></CardFooter>
    </Card>
  )
}
