import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ISSUE_PRIORITIES, ISSUE_STATUSES, priorityMeta, statusMeta, type ProjectManagementData } from '@/lib/project-data'
import { useCreateIssueMutation } from '@/lib/project-queries'
import { useProjectUi } from '@/lib/project-ui'
import type { IssueInput } from '@/lib/project-store'

function defaultInput(data: ProjectManagementData): IssueInput {
  return {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: data.members[0]?.name || 'Ally',
    teamKey: data.teams[0]?.key || 'PRODUCT',
    projectKey: data.projects[0]?.key || 'pm-admin',
    label: 'General',
    dueDate: new Date().toISOString().slice(0, 10),
  }
}

export function CreateIssueDialog({ data }: { data: ProjectManagementData }) {
  const ui = useProjectUi()
  const createIssue = useCreateIssueMutation()
  const initial = useMemo(() => defaultInput(data), [data])
  const [input, setInput] = useState<IssueInput>(initial)

  async function submit() {
    if (!input.title.trim()) {
      toast.error('Issue title is required')
      return
    }
    await createIssue.mutateAsync(input)
    toast.success('Issue created')
    setInput(initial)
    ui.setCreateOpen(false)
  }

  const update = (patch: Partial<IssueInput>) => setInput((current) => ({ ...current, ...patch }))

  return (
    <Dialog open={ui.createOpen} onOpenChange={ui.setCreateOpen}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>Create issue</DialogTitle>
          <DialogDescription>Add a runtime-backed issue to the project workspace.</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-2 sm:grid-cols-2'>
          <div className='flex flex-col gap-2 sm:col-span-2'>
            <Label htmlFor='issue-title'>Title</Label>
            <Input id='issue-title' value={input.title} onChange={(event) => update({ title: event.target.value })} placeholder='Describe the task clearly' />
          </div>
          <div className='flex flex-col gap-2 sm:col-span-2'>
            <Label htmlFor='issue-description'>Description</Label>
            <Textarea id='issue-description' value={input.description} onChange={(event) => update({ description: event.target.value })} placeholder='Scope, constraints, and verification notes' />
          </div>
          <SelectField label='Status' value={input.status} onChange={(value) => update({ status: value as IssueInput['status'] })} items={ISSUE_STATUSES.map((status) => ({ value: status, label: statusMeta[status].label }))} />
          <SelectField label='Priority' value={input.priority} onChange={(value) => update({ priority: value as IssueInput['priority'] })} items={ISSUE_PRIORITIES.map((priority) => ({ value: priority, label: priorityMeta[priority].label }))} />
          <SelectField label='Assignee' value={input.assignee} onChange={(value) => update({ assignee: value })} items={data.members.map((member) => ({ value: member.name, label: member.name }))} />
          <SelectField label='Team' value={input.teamKey} onChange={(value) => update({ teamKey: value })} items={data.teams.map((team) => ({ value: team.key, label: team.name }))} />
          <SelectField label='Project' value={input.projectKey} onChange={(value) => update({ projectKey: value })} items={data.projects.map((project) => ({ value: project.key, label: project.name }))} />
          <div className='flex flex-col gap-2'>
            <Label htmlFor='issue-due'>Due date</Label>
            <Input id='issue-due' type='date' value={input.dueDate} onChange={(event) => update({ dueDate: event.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => ui.setCreateOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={createIssue.isPending}>Create issue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SelectField({ label, value, items, onChange }: { label: string; value: string; items: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  const id = 'pm-' + label.toLowerCase()
  return (
    <div className='flex flex-col gap-2'>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          {items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
