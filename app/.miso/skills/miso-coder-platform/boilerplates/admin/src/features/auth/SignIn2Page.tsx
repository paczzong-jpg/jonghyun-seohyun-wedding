import { Link } from 'react-router-dom'
import { ArrowRight, GalleryVerticalEnd, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'

export function SignIn2Page() {
  return (
    <main className='grid min-h-screen bg-muted/40 lg:grid-cols-2'>
      <section className='hidden flex-col justify-between border-r bg-background p-10 lg:flex'>
        <div className='flex items-center gap-2 text-sm font-semibold'>
          <div className='flex size-8 items-center justify-center rounded-md border'>
            <GalleryVerticalEnd className='size-4' />
          </div>
          MISO Admin
        </div>
        <div className='max-w-md space-y-4'>
          <h1 className='text-4xl font-bold tracking-tight'>Operate generated apps with a real admin surface.</h1>
          <p className='text-muted-foreground'>This two-column auth page mirrors shadcn-admin while keeping MISO auth and PocketBase recipes as the integration points.</p>
        </div>
      </section>
      <section className='grid place-items-center p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use MISO auth, PocketBase auth, or your customer SSO recipe behind this form.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='signin2-email'>Email</Label>
              <Input id='signin2-email' type='email' defaultValue='operator@miso.local' />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='signin2-password'>Password</Label>
              <PasswordInput id='signin2-password' defaultValue='miso-admin' />
            </div>
            <Button className='w-full' onClick={() => toast.success('Connect this form to recipes/miso/auth or recipes/pocketbase/auth')}><LogIn className='mr-2 size-4' />Continue</Button>
            <div className='flex justify-between text-sm text-muted-foreground'>
              <Link to='/forgot-password'>Forgot password?</Link>
              <Link to='/sign-up' className='inline-flex items-center gap-1'>Create account <ArrowRight className='size-3' /></Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
