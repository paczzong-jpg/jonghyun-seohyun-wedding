import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/crm/page-header"
import { TASK_STATUS_LABEL, TEAM_MEMBERS } from "@/lib/crm-config"
import { companyOptions, dealOptions, deleteTask, listTasks, saveTask } from "@/lib/crm-store"
import type { TaskInput } from "@/lib/crm-store"
import type { CrmTask, Option, TaskStatus } from "@/lib/crm-types"

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === "string" ? value.trim() : ""
}

const statuses: TaskStatus[] = ["todo", "doing", "done", "blocked"]

export function TasksPage() {
  const [rows, setRows] = useState<CrmTask[]>([])
  const [companies, setCompanies] = useState<Option[]>([])
  const [deals, setDeals] = useState<Option[]>([])
  const [editing, setEditing] = useState<CrmTask | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [result, companyRows, dealRows] = await Promise.all([listTasks(), companyOptions(), dealOptions()])
      setRows(result.items)
      setCompanies(companyRows)
      setDeals(dealRows)
    } catch {
      toast.error("Tasks를 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input: TaskInput = {
      title: field(form, "title"),
      status: field(form, "status") as TaskStatus,
      dueDate: field(form, "dueDate"),
      owner: field(form, "owner"),
      company: field(form, "company"),
      deal: field(form, "deal"),
      memo: field(form, "memo"),
    }
    await saveTask(input, editing?.id)
    toast.success(editing ? "Task updated" : "Task created")
    setOpen(false)
    setEditing(null)
    await load()
  }

  async function remove(id: string) {
    await deleteTask(id)
    toast.success("Task deleted")
    await load()
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups, handoffs, blockers, and sales operations work."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="size-4" />Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={submit}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="task-title">Title</Label>
                  <Input id="task-title" name="title" required defaultValue={editing?.title ?? ""} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Status
                    <select name="status" defaultValue={editing?.status ?? "todo"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {statuses.map((status) => <option key={status} value={status}>{TASK_STATUS_LABEL[status]}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Owner
                    <select name="owner" defaultValue={editing?.owner ?? "Ally"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {TEAM_MEMBERS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="task-due">Due date</Label>
                    <Input id="task-due" name="dueDate" type="date" defaultValue={editing?.dueDate ?? ""} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Company
                    <select name="company" defaultValue={editing?.company ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">No company</option>
                      {companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Deal
                    <select name="deal" defaultValue={editing?.deal ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">No deal</option>
                      {deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.label}</option>)}
                    </select>
                  </label>
                </div>
                <Textarea name="memo" placeholder="Memo" defaultValue={editing?.memo ?? ""} />
                <Button type="submit">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead><TableHead>Related</TableHead><TableHead>Due</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6}>Loading</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No tasks</TableCell></TableRow>}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell><span className="font-medium">{row.title}</span><p className="text-xs text-muted-foreground">{row.memo}</p></TableCell>
                <TableCell><Badge variant="secondary">{TASK_STATUS_LABEL[row.status]}</Badge></TableCell>
                <TableCell>{row.owner}</TableCell>
                <TableCell>{row.companyName || row.dealTitle || "-"}</TableCell>
                <TableCell>{row.dueDate || "-"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Row menu"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(row); setOpen(true) }}>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void remove(row.id)}><Trash2 className="mr-2 size-4" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
