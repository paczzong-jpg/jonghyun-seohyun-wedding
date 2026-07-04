import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function ProfileSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Default owner identity for this admin console.</CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='profile-name'>Name</Label>
          <Input id='profile-name' defaultValue='Young' />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='profile-email'>Email</Label>
          <Input id='profile-email' defaultValue='young@miso.local' />
        </div>
        <div className='space-y-2 sm:col-span-2'>
          <Label htmlFor='profile-bio'>Bio</Label>
          <Textarea id='profile-bio' defaultValue='MISO PO. Reviews generated app behavior and release scope.' />
        </div>
      </CardContent>
      <CardFooter><Button onClick={() => toast.success('Profile settings saved locally')}><Save className='mr-2 size-4' />Save profile</Button></CardFooter>
    </Card>
  )
}
