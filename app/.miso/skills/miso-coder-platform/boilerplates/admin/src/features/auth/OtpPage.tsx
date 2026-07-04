import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { AuthFooter, AuthFrame } from '@/features/auth/SignInPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OtpPage() {
  return (
    <AuthFrame title='Verify code' description='OTP placeholder without adding input-otp dependency.'>
      <div className='space-y-4'>
        <div className='space-y-2'><Label htmlFor='otp'>One-time code</Label><Input id='otp' inputMode='numeric' maxLength={6} defaultValue='123456' /></div>
        <Button className='w-full' onClick={() => toast.success('OTP verification action ready for your auth recipe')}><KeyRound className='mr-2 size-4' />Verify</Button>
      </div>
      <AuthFooter><Link to='/sign-in'>Back to sign in</Link></AuthFooter>
    </AuthFrame>
  )
}
