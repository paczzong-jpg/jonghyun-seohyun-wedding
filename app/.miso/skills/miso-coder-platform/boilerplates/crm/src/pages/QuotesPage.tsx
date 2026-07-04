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
import { QUOTE_STATUS_LABEL, TEAM_MEMBERS } from "@/lib/crm-config"
import { companyOptions, dealOptions, deleteQuote, listQuotes, saveQuote } from "@/lib/crm-store"
import type { QuoteInput } from "@/lib/crm-store"
import type { Option, Quote, QuoteStatus } from "@/lib/crm-types"

const statuses: QuoteStatus[] = ["draft", "sent", "accepted", "declined"]

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === "string" ? value.trim() : ""
}

function amount(form: FormData, name: string): number {
  const value = Number(field(form, name))
  return Number.isFinite(value) ? value : 0
}

export function QuotesPage() {
  const [rows, setRows] = useState<Quote[]>([])
  const [companies, setCompanies] = useState<Option[]>([])
  const [deals, setDeals] = useState<Option[]>([])
  const [editing, setEditing] = useState<Quote | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [result, companyRows, dealRows] = await Promise.all([listQuotes(), companyOptions(), dealOptions()])
      setRows(result.items)
      setCompanies(companyRows)
      setDeals(dealRows)
    } catch {
      toast.error("Quotes를 불러오지 못했습니다.")
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
    const input: QuoteInput = {
      title: field(form, "title"),
      status: field(form, "status") as QuoteStatus,
      amount: amount(form, "amount"),
      owner: field(form, "owner"),
      company: field(form, "company"),
      deal: field(form, "deal"),
      expiresAt: field(form, "expiresAt"),
      memo: field(form, "memo"),
    }
    await saveQuote(input, editing?.id)
    toast.success(editing ? "Quote updated" : "Quote created")
    setOpen(false)
    setEditing(null)
    await load()
  }

  async function remove(id: string) {
    await deleteQuote(id)
    toast.success("Quote deleted")
    await load()
  }

  return (
    <>
      <PageHeader
        title="Quotes"
        description="Proposals, commercial terms, expiry dates, and acceptance status."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="size-4" />Quote</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit quote" : "New quote"}</DialogTitle></DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={submit}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quote-title">Title</Label>
                  <Input id="quote-title" name="title" required defaultValue={editing?.title ?? ""} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="quote-amount">Amount</Label>
                    <Input id="quote-amount" name="amount" type="number" defaultValue={editing?.amount ?? 0} />
                  </div>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Status
                    <select name="status" defaultValue={editing?.status ?? "draft"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {statuses.map((status) => <option key={status} value={status}>{QUOTE_STATUS_LABEL[status]}</option>)}
                    </select>
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="quote-expire">Expires</Label>
                    <Input id="quote-expire" name="expiresAt" type="date" defaultValue={editing?.expiresAt ?? ""} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Owner
                    <select name="owner" defaultValue={editing?.owner ?? "Young"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {TEAM_MEMBERS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
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
          <TableHeader><TableRow><TableHead>Quote</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead><TableHead>Owner</TableHead><TableHead>Expires</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6}>Loading</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No quotes</TableCell></TableRow>}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell><span className="font-medium">{row.title}</span><p className="text-xs text-muted-foreground">{row.companyName || row.dealTitle}</p></TableCell>
                <TableCell><Badge variant="secondary">{QUOTE_STATUS_LABEL[row.status]}</Badge></TableCell>
                <TableCell>{row.amount.toLocaleString("ko-KR")}원</TableCell>
                <TableCell>{row.owner}</TableCell>
                <TableCell>{row.expiresAt || "-"}</TableCell>
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
