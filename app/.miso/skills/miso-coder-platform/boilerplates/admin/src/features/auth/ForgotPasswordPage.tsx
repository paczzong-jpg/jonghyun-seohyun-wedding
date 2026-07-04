import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { AuthFooter, AuthFrame } from '@/features/auth/SignInPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordPage() {
  return (
    <AuthFrame title='Reset password' description='Send a reset link through the configured auth recipe.'>
      <div className='space-y-4'>
        <div className='space-y-2'><Label htmlFor='email'>Email</Label><Input id='email' type='email' defaultValue='young@miso.local' /></div>
        <Button className='w-full' onClick={() => toast.success('Password reset action ready for your auth recipe')}><Mail className='mr-2 size-4' />Send reset link</Button>
      </div>
      <AuthFooter><Link to='/sign-in'>Back to sign in</Link></AuthFooter>
    </AuthFrame>
  )
}
