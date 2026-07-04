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
import { COMPANY_SIZES, INDUSTRIES, TEAM_MEMBERS } from "@/lib/crm-config"
import { deleteCompany, listCompanies, saveCompany } from "@/lib/crm-store"
import type { CompanyInput } from "@/lib/crm-store"
import type { Company } from "@/lib/crm-types"

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === "string" ? value.trim() : ""
}

export function CompaniesPage() {
  const [rows, setRows] = useState<Company[]>([])
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Company | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listCompanies({ search })
      setRows(result.items)
    } catch {
      toast.error("Companies를 불러오지 못했습니다.")
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
    const input: CompanyInput = {
      name: field(form, "name"),
      industry: field(form, "industry"),
      owner: field(form, "owner"),
      website: field(form, "website"),
      size: field(form, "size"),
      health: field(form, "health") || "green",
    }
    await saveCompany(input, editing?.id)
    toast.success(editing ? "Company updated" : "Company created")
    setOpen(false)
    setEditing(null)
    await load()
  }

  async function remove(id: string) {
    await deleteCompany(id)
    toast.success("Company deleted")
    await load()
  }

  return (
    <>
      <PageHeader
        title="Companies"
        description="Accounts, owners, industry segments, and customer health."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4" />
                Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit company" : "New company"}</DialogTitle>
              </DialogHeader>
              <form className="flex flex-col gap-4" onSubmit={submit}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="company-name">Name</Label>
                  <Input id="company-name" name="name" required defaultValue={editing?.name ?? ""} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Industry
                    <select name="industry" defaultValue={editing?.industry ?? INDUSTRIES[0]} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {INDUSTRIES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Size
                    <select name="size" defaultValue={editing?.size ?? COMPANY_SIZES[2]} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {COMPANY_SIZES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Owner
                    <select name="owner" defaultValue={editing?.owner ?? "Young"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {TEAM_MEMBERS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Health
                    <select name="health" defaultValue={editing?.health ?? "green"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="green">green</option>
                      <option value="yellow">yellow</option>
                      <option value="red">red</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="company-website">Website</Label>
                  <Input id="company-website" name="website" defaultValue={editing?.website ?? ""} />
                </div>
                <Button type="submit">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex max-w-md gap-2">
        <Input value={search} placeholder="Search companies" onChange={(event) => setSearch(event.target.value)} />
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Website</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6}>Loading</TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No companies</TableCell></TableRow>}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.industry}</TableCell>
                <TableCell>{row.owner}</TableCell>
                <TableCell>{row.health}</TableCell>
                <TableCell>{row.website || "-"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Row menu"><MoreHorizontal className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(row); setOpen(true) }}>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void remove(row.id)}>
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
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
