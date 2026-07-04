import { forwardRef, useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PasswordInputProps = ComponentProps<typeof Input>

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className='relative'>
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', className)}
        autoCapitalize='off'
        autoCorrect='off'
        spellCheck={false}
        {...props}
      />
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent'
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
      </Button>
    </div>
  )
})
PasswordInput.displayName = 'PasswordInput'
