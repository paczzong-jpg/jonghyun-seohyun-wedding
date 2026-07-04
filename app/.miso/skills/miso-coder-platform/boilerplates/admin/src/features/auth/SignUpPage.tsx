import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { AuthFooter, AuthFrame } from '@/features/auth/SignInPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUpPage() {
  return (
    <AuthFrame title='Create account' description='Invite an operator into this admin console.'>
      <div className='space-y-4'>
        <div className='space-y-2'><Label htmlFor='name'>Name</Label><Input id='name' defaultValue='Heather' /></div>
        <div className='space-y-2'><Label htmlFor='email'>Email</Label><Input id='email' type='email' defaultValue='heather@miso.local' /></div>
        <div className='space-y-2'><Label htmlFor='password'>Password</Label><Input id='password' type='password' /></div>
        <Button className='w-full' onClick={() => toast.success('Account form ready; wire create flow through an auth recipe')}><UserPlus className='mr-2 size-4' />Create account</Button>
      </div>
      <AuthFooter><Link to='/sign-in'>Already have an account?</Link></AuthFooter>
    </AuthFrame>
  )
}
