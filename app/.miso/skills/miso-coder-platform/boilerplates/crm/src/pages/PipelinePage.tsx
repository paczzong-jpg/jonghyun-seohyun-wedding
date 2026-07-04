import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/crm/page-header"
import { PipelineBoard } from "@/components/crm/pipeline-board"
import { DEAL_STAGE_LABEL, DEAL_STAGES, TEAM_MEMBERS } from "@/lib/crm-config"
import { companyOptions, contactOptions, saveDeal } from "@/lib/crm-store"
import type { DealInput } from "@/lib/crm-store"
import type { Deal, DealStage, Option } from "@/lib/crm-types"

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === "string" ? value.trim() : ""
}

function amount(form: FormData, name: string): number {
  const value = Number(field(form, name))
  return Number.isFinite(value) ? value : 0
}

export function PipelinePage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Deal | null>(null)
  const [defaultStage, setDefaultStage] = useState<DealStage>("lead")
  const [companies, setCompanies] = useState<Option[]>([])
  const [contacts, setContacts] = useState<Option[]>([])

  useEffect(() => {
    async function loadOptions() {
      const [companyRows, contactRows] = await Promise.all([companyOptions(), contactOptions()])
      setCompanies(companyRows)
      setContacts(contactRows)
    }
    void loadOptions()
  }, [refreshKey])

  function add(stage: DealStage) {
    setEditing(null)
    setDefaultStage(stage)
    setOpen(true)
  }

  function edit(deal: Deal) {
    setEditing(deal)
    setDefaultStage(deal.stage)
    setOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input: DealInput = {
      title: field(form, "title"),
      value: amount(form, "value"),
      stage: field(form, "stage") as DealStage,
      probability: amount(form, "probability"),
      owner: field(form, "owner"),
      company: field(form, "company"),
      contact: field(form, "contact"),
      closeDate: field(form, "closeDate"),
      nextStep: field(form, "nextStep"),
    }
    await saveDeal(input, editing?.id)
    toast.success(editing ? "Deal updated" : "Deal created")
    setOpen(false)
    setEditing(null)
    setRefreshKey((value) => value + 1)
  }

  return (
    <>
      <PageHeader title="Pipeline" description="Drag deals across stages or update stages from each card." />
      <PipelineBoard refreshKey={refreshKey} onAdd={add} onEdit={edit} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit deal" : "New deal"}</DialogTitle></DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-title">Title</Label>
              <Input id="deal-title" name="title" required defaultValue={editing?.title ?? ""} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deal-value">Value</Label>
                <Input id="deal-value" name="value" type="number" defaultValue={editing?.value ?? 0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deal-probability">Probability</Label>
                <Input id="deal-probability" name="probability" type="number" min="0" max="100" defaultValue={editing?.probability ?? 30} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deal-close">Close date</Label>
                <Input id="deal-close" name="closeDate" type="date" defaultValue={editing?.closeDate ?? ""} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Stage
                <select name="stage" defaultValue={editing?.stage ?? defaultStage} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {DEAL_STAGES.map((stage) => <option key={stage} value={stage}>{DEAL_STAGE_LABEL[stage]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Owner
                <select name="owner" defaultValue={editing?.owner ?? "Eugene"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {TEAM_MEMBERS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Company
                <select name="company" defaultValue={editing?.company ?? companies[0]?.id ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">No company</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Contact
                <select name="contact" defaultValue={editing?.contact ?? contacts[0]?.id ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">No contact</option>
                  {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.label}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-next">Next step</Label>
              <Textarea id="deal-next" name="nextStep" defaultValue={editing?.nextStep ?? ""} />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
