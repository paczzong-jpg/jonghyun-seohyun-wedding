import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useUsers } from '@/features/users/users-context'
import { useCreateUserMutation, useDeleteUserMutation, useDeleteUsersMutation, useUpdateUserMutation } from '@/lib/admin-queries'
import {
  USER_DEPARTMENTS,
  USER_ROLES,
  USER_STATUSES,
  defaultUserInput,
  type UserDepartment,
  type UserInput,
  type UserRole,
  type UserStatus,
} from '@/lib/admin-users'

const CONFIRM_WORD = 'DELETE'

export function UserDialogs() {
  const { open, setOpen, currentUser, setCurrentUser, bulkUserIds, setBulkUserIds } = useUsers()
  const createUser = useCreateUserMutation()
  const updateUser = useUpdateUserMutation()
  const deleteUser = useDeleteUserMutation()
  const deleteUsers = useDeleteUsersMutation()
  const [input, setInput] = useState<UserInput>(defaultUserInput)
  const [inviteEmail, setInviteEmail] = useState('')
  const [confirmValue, setConfirmValue] = useState('')

  const isFormOpen = open === 'create' || open === 'edit'

  useEffect(() => {
    if (open === 'edit' && currentUser) {
      setInput({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        username: currentUser.username,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber,
        status: currentUser.status,
        role: currentUser.role,
        department: currentUser.department,
      })
    }
    if (open === 'create') setInput(defaultUserInput)
    if (open === 'invite') setInviteEmail('')
    if (open === 'bulk-delete') setConfirmValue('')
  }, [open, currentUser])

  function validateUser(value: UserInput) {
    if (!value.firstName.trim()) return 'First name is required'
    if (!value.username.trim()) return 'Username is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return 'Valid email is required'
    return ''
  }

  async function submitForm() {
    const message = validateUser(input)
    if (message) {
      toast.error(message)
      return
    }
    if (open === 'edit' && currentUser) {
      await updateUser.mutateAsync({ id: currentUser.id, input })
      toast.success('User updated')
    } else {
      await createUser.mutateAsync(input)
      toast.success('User created')
    }
    setCurrentUser(null)
    setOpen(null)
  }

  async function submitInvite() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error('Valid invite email is required')
      return
    }
    const [name] = inviteEmail.split('@')
    await createUser.mutateAsync({
      ...defaultUserInput,
      firstName: name || 'Invited',
      lastName: '',
      username: name || inviteEmail,
      email: inviteEmail,
      status: 'invited',
      role: 'viewer',
    })
    toast.success('Invitation created')
    setOpen(null)
  }

  async function confirmDelete() {
    if (!currentUser) return
    await deleteUser.mutateAsync(currentUser.id)
    toast.success('User deleted')
    setCurrentUser(null)
    setOpen(null)
  }

  async function confirmBulkDelete() {
    if (confirmValue !== CONFIRM_WORD) return
    await deleteUsers.mutateAsync(bulkUserIds)
    toast.success('Deleted ' + bulkUserIds.length + ' users')
    setBulkUserIds([])
    setOpen(null)
  }

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={(value) => setOpen(value ? open : null)}>
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>{open === 'edit' ? 'Edit user' : 'Add user'}</DialogTitle>
            <DialogDescription>Create or update an admin_users record. Passwords are intentionally not stored in this public boilerplate collection.</DialogDescription>
          </DialogHeader>
          <UserForm input={input} onChange={setInput} />
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={submitForm} disabled={createUser.isPending || updateUser.isPending}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === 'invite'} onOpenChange={(value) => setOpen(value ? 'invite' : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>Create an invited admin_users row. Wire actual email sending with an email integration recipe when needed.</DialogDescription>
          </DialogHeader>
          <div className='space-y-2'>
            <Label htmlFor='invite-email'>Email</Label>
            <Input id='invite-email' type='email' value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder='operator@example.com' />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={submitInvite} disabled={createUser.isPending}>Create invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={open === 'delete'}
        onOpenChange={(value) => setOpen(value ? 'delete' : null)}
        title='Delete user'
        description={currentUser ? 'Delete ' + currentUser.email + ' from admin_users?' : 'Delete this user?'}
        confirmText='Delete'
        destructive
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={open === 'bulk-delete'}
        onOpenChange={(value) => setOpen(value ? 'bulk-delete' : null)}
        title={<span className='text-destructive'><AlertTriangle className='mr-1 inline-block size-4' />Delete {bulkUserIds.length} users</span>}
        description={
          <div className='space-y-4'>
            <p>This action deletes selected admin_users records and cannot be undone.</p>
            <Label className='block space-y-2'>
              <span>Confirm by typing "{CONFIRM_WORD}"</span>
              <Input value={confirmValue} onChange={(event) => setConfirmValue(event.target.value)} placeholder={'Type "' + CONFIRM_WORD + '"'} autoFocus />
            </Label>
            <Alert variant='destructive'>
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>Use role/status changes instead when the account should be recoverable.</AlertDescription>
            </Alert>
          </div>
        }
        confirmText='Delete'
        disabled={confirmValue !== CONFIRM_WORD || deleteUsers.isPending}
        destructive
        onConfirm={confirmBulkDelete}
      />
    </>
  )
}

function UserForm({ input, onChange }: { input: UserInput; onChange: (input: UserInput) => void }) {
  const update = (patch: Partial<UserInput>) => onChange({ ...input, ...patch })
  return (
    <div className='grid gap-4 py-2 sm:grid-cols-2'>
      <div className='space-y-2'>
        <Label htmlFor='user-first-name'>First name</Label>
        <Input id='user-first-name' value={input.firstName} onChange={(event) => update({ firstName: event.target.value })} />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='user-last-name'>Last name</Label>
        <Input id='user-last-name' value={input.lastName} onChange={(event) => update({ lastName: event.target.value })} />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='user-username'>Username</Label>
        <Input id='user-username' value={input.username} onChange={(event) => update({ username: event.target.value })} />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='user-email'>Email</Label>
        <Input id='user-email' type='email' value={input.email} onChange={(event) => update({ email: event.target.value })} />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='user-phone'>Phone</Label>
        <Input id='user-phone' value={input.phoneNumber} onChange={(event) => update({ phoneNumber: event.target.value })} />
      </div>
      <SelectField label='Status' value={input.status} values={USER_STATUSES} onChange={(value) => update({ status: value as UserStatus })} />
      <SelectField label='Role' value={input.role} values={USER_ROLES} onChange={(value) => update({ role: value as UserRole })} />
      <SelectField label='Department' value={input.department} values={USER_DEPARTMENTS} onChange={(value) => update({ department: value as UserDepartment })} />
    </div>
  )
}

function SelectField<T extends readonly string[]>({ label, value, values, onChange }: { label: string; value: string; values: T; onChange: (value: T[number]) => void }) {
  const id = 'user-field-' + label.toLowerCase()
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T[number])}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          {values.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
