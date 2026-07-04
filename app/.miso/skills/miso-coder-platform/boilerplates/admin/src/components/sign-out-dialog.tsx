import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: Props) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Sign out'
      description='This generated admin boilerplate does not own MISO session cookies. Wire this action to recipes/miso/auth or pocketbase/auth in a real app.'
      confirmText='Sign out'
      onConfirm={() => {
        toast.success('Sign-out handler ready')
        onOpenChange(false)
      }}
    />
  )
}

export function SignOutButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant='ghost' className='w-full justify-start px-2' onClick={onClick}>
      <LogOut className='mr-2 size-4' />
      Sign out
    </Button>
  )
}
