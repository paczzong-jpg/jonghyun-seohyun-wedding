import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTasks } from '@/features/tasks/tasks-context'
import { useCreateTaskMutation, useDeleteTaskMutation, useDeleteTasksMutation, useUpdateTaskMutation } from '@/lib/admin-queries'
import { importFromCsv } from '@/lib/csv'
import {
  TASK_CATEGORIES,
  TASK_OWNERS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  defaultTaskInput,
  type TaskCategory,
  type TaskInput,
  type TaskOwner,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/admin-tasks'

const CONFIRM_WORD = 'DELETE'

export function TaskDialogs() {
  const { open, setOpen, currentTask, setCurrentTask, bulkTaskIds, setBulkTaskIds } = useTasks()
  const createTask = useCreateTaskMutation()
  const updateTask = useUpdateTaskMutation()
  const deleteTask = useDeleteTaskMutation()
  const deleteTasks = useDeleteTasksMutation()
  const [input, setInput] = useState<TaskInput>(defaultTaskInput)
  const [confirmValue, setConfirmValue] = useState('')

  const isFormOpen = open === 'create' || open === 'edit'
  const title = open === 'edit' ? 'Edit task' : 'Create task'

  useEffect(() => {
    if (open === 'edit' && currentTask) {
      setInput({
        name: currentTask.name,
        category: currentTask.category,
        status: currentTask.status,
        priority: currentTask.priority,
        owner: currentTask.owner,
        amount: currentTask.amount,
        dueDate: currentTask.dueDate,
        memo: currentTask.memo,
      })
    }
    if (open === 'create') setInput(defaultTaskInput)
    if (open === 'bulk-delete') setConfirmValue('')
  }, [open, currentTask])

  async function submitForm() {
    if (!input.name.trim()) {
      toast.error('Task name is required')
      return
    }
    if (open === 'edit' && currentTask) {
      await updateTask.mutateAsync({ id: currentTask.id, input })
      toast.success('Task updated')
    } else {
      await createTask.mutateAsync(input)
      toast.success('Task created')
    }
    setCurrentTask(null)
    setOpen(null)
  }

  async function confirmDelete() {
    if (!currentTask) return
    await deleteTask.mutateAsync(currentTask.id)
    toast.success('Task deleted')
    setCurrentTask(null)
    setOpen(null)
  }

  async function confirmBulkDelete() {
    if (confirmValue !== CONFIRM_WORD) return
    await deleteTasks.mutateAsync(bulkTaskIds)
    toast.success('Deleted ' + bulkTaskIds.length + ' tasks')
    setBulkTaskIds([])
    setOpen(null)
  }

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={(value) => setOpen(value ? open : null)}>
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Create or update a PocketBase admin_tasks record.</DialogDescription>
          </DialogHeader>
          <TaskForm input={input} onChange={setInput} />
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={submitForm} disabled={createTask.isPending || updateTask.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ImportDialog open={open === 'import'} onOpenChange={(value) => setOpen(value ? 'import' : null)} />
      <ConfirmDialog
        open={open === 'delete'}
        onOpenChange={(value) => setOpen(value ? 'delete' : null)}
        title='Delete task'
        description={currentTask ? 'Delete "' + currentTask.name + '" from admin_tasks?' : 'Delete this task?'}
        confirmText='Delete'
        destructive
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={open === 'bulk-delete'}
        onOpenChange={(value) => setOpen(value ? 'bulk-delete' : null)}
        title={<span className='text-destructive'><AlertTriangle className='mr-1 inline-block size-4' />Delete {bulkTaskIds.length} tasks</span>}
        description={
          <div className='space-y-4'>
            <p>This action deletes selected admin_tasks records and cannot be undone.</p>
            <Label className='block space-y-2'>
              <span>Confirm by typing "{CONFIRM_WORD}"</span>
              <Input value={confirmValue} onChange={(event) => setConfirmValue(event.target.value)} placeholder={'Type "' + CONFIRM_WORD + '"'} autoFocus />
            </Label>
            <Alert variant='destructive'>
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>Export selected rows before deleting if this data must be audited.</AlertDescription>
            </Alert>
          </div>
        }
        confirmText='Delete'
        disabled={confirmValue !== CONFIRM_WORD || deleteTasks.isPending}
        destructive
        onConfirm={confirmBulkDelete}
      />
    </>
  )
}

function TaskForm({ input, onChange }: { input: TaskInput; onChange: (input: TaskInput) => void }) {
  const update = (patch: Partial<TaskInput>) => onChange({ ...input, ...patch })
  return (
    <div className='grid gap-4 py-2 sm:grid-cols-2'>
      <div className='space-y-2 sm:col-span-2'>
        <Label htmlFor='task-name'>Task</Label>
        <Input id='task-name' value={input.name} onChange={(event) => update({ name: event.target.value })} />
      </div>
      <SelectField label='Category' value={input.category} values={TASK_CATEGORIES} onChange={(value) => update({ category: value as TaskCategory })} />
      <SelectField label='Status' value={input.status} values={TASK_STATUSES} onChange={(value) => update({ status: value as TaskStatus })} />
      <SelectField label='Priority' value={input.priority} values={TASK_PRIORITIES} onChange={(value) => update({ priority: value as TaskPriority })} />
      <SelectField label='Owner' value={input.owner} values={TASK_OWNERS} onChange={(value) => update({ owner: value as TaskOwner })} />
      <div className='space-y-2'>
        <Label htmlFor='task-due'>Due date</Label>
        <Input id='task-due' type='date' value={input.dueDate} onChange={(event) => update({ dueDate: event.target.value })} />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='task-amount'>Amount</Label>
        <Input id='task-amount' type='number' value={input.amount} onChange={(event) => update({ amount: Number(event.target.value) })} />
      </div>
      <div className='space-y-2 sm:col-span-2'>
        <Label htmlFor='task-memo'>Memo</Label>
        <Textarea id='task-memo' value={input.memo} onChange={(event) => update({ memo: event.target.value })} />
      </div>
    </div>
  )
}

function SelectField<T extends readonly string[]>({ label, value, values, onChange }: { label: string; value: string; values: T; onChange: (value: T[number]) => void }) {
  const id = 'field-' + label.toLowerCase()
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

function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createTask = useCreateTaskMutation()
  const [file, setFile] = useState<File | null>(null)
  const disabled = useMemo(() => !file || createTask.isPending, [file, createTask.isPending])

  async function importRows() {
    if (!file) return
    const rows = await importFromCsv(file)
    for (const row of rows) {
      await createTask.mutateAsync({
        name: row['업무명'] || row.name || 'Imported task',
        category: coerce(row['구분'], TASK_CATEGORIES, '운영'),
        status: coerce(row['상태'], TASK_STATUSES, '대기'),
        priority: coerce(row['우선순위'], TASK_PRIORITIES, '보통'),
        owner: coerce(row['담당자'], TASK_OWNERS, 'Ally'),
        dueDate: row['마감일'] || new Date().toISOString().slice(0, 10),
        amount: Number(row['금액(원)'] || row.amount || 0),
        memo: row['메모'] || '',
      })
    }
    toast.success('Imported ' + rows.length + ' tasks')
    setFile(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>Use the README header format to seed admin_tasks records.</DialogDescription>
        </DialogHeader>
        <Input type='file' accept='.csv,text/csv' onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={importRows} disabled={disabled}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function coerce<T extends readonly string[]>(value: string | undefined, values: T, fallback: T[number]): T[number] {
  return value && values.includes(value) ? value as T[number] : fallback
}
