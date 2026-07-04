import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/crm/page-header"
import { TEAM_MEMBERS } from "@/lib/crm-config"
import { companyOptions, deleteContact, listContacts, saveContact } from "@/lib/crm-store"
import type { ContactInput } from "@/lib/crm-store"
import type { Contact, Option } from "@/lib/crm-types"

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === "string" ? value.trim() : ""
}

export function ContactsPage() {
  const [rows, setRows] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Option[]>([])
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Contact | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [result, companyRows] = await Promise.all([listContacts({ search }), companyOptions()])
      setRows(result.items)
      setCompanies(companyRows)
    } catch {
      toast.error("Contacts를 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input: ContactInput = {
      name: field(form, "name"),
      email: field(form, "email"),
      phone: field(form, "phone"),
      title: field(form, "title"),
      owner: field(form, "owner"),
      company: field(form, "company"),
      lastContactedAt: field(form, "lastContactedAt"),
    }
    await saveContact(input, editing?.id)
    toast.success(editing ? "Contact updated" : "Contact created")
    setOpen(false)
    setEditing(null)
    await load()
  }

  async function remove(id: string) {
    await deleteContact(id)
    toast.success("Contact deleted")
    await load()
  }

  return (
    <>
      <PageHeader
        title="Contacts"
        description="People, relationship owners, and last-touch tracking."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4" />
                Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle></DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={submit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input id="contact-name" name="name" required defaultValue={editing?.name ?? ""} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact-title">Title</Label>
                    <Input id="contact-title" name="title" defaultValue={editing?.title ?? ""} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input id="contact-email" name="email" type="email" defaultValue={editing?.email ?? ""} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact-phone">Phone</Label>
                    <Input id="contact-phone" name="phone" defaultValue={editing?.phone ?? ""} />
                  </div>
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
                    Owner
                    <select name="owner" defaultValue={editing?.owner ?? "Ally"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {TEAM_MEMBERS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="last-contacted">Last contacted</Label>
                  <Input id="last-contacted" name="lastContactedAt" type="date" defaultValue={editing?.lastContactedAt ?? ""} />
                </div>
                <Button type="submit">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Input className="max-w-md" value={search} placeholder="Search contacts" onChange={(event) => setSearch(event.target.value)} />
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Last touch</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6}>Loading</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No contacts</TableCell></TableRow>}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell><span className="font-medium">{row.name}</span><p className="text-xs text-muted-foreground">{row.title}</p></TableCell>
                <TableCell>{row.companyName || "-"}</TableCell>
                <TableCell>{row.email || "-"}</TableCell>
                <TableCell>{row.owner}</TableCell>
                <TableCell>{row.lastContactedAt || "-"}</TableCell>
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
