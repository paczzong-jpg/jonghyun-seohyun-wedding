import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GalleryVerticalEnd, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'

export function SignInPage() {
  return (
    <AuthFrame title='Welcome back' description='Sign in to the generated admin console.'>
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='email'>Email</Label>
          <Input id='email' type='email' defaultValue='young@miso.local' />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='password'>Password</Label>
          <PasswordInput id='password' defaultValue='miso-admin' />
        </div>
        <Button className='w-full' onClick={() => toast.success('Connect this form to recipes/miso/auth or recipes/pocketbase/auth')}><LogIn className='mr-2 size-4' />Sign in</Button>
      </div>
      <AuthFooter><Link to='/forgot-password'>Forgot password?</Link><Link to='/sign-up'>Create account</Link></AuthFooter>
    </AuthFrame>
  )
}

export function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className='grid min-h-screen place-items-center bg-muted/40 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-2 flex size-10 items-center justify-center rounded-md border bg-background'>
            <GalleryVerticalEnd className='size-5' />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  )
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <CardFooter className='mt-4 flex justify-between px-0 text-sm text-muted-foreground'>{children}</CardFooter>
}
