import pb from "@/lib/miso-sdk/runtime-client"
import { CRM_APP, DEAL_STAGES } from "@/lib/crm-config"
import type {
  Company,
  Contact,
  CrmTask,
  DashboardSummary,
  Deal,
  DealStage,
  ListResult,
  Option,
  Quote,
  TaskStatus,
} from "@/lib/crm-types"

export const CRM_COLLECTIONS = {
  companies: "crm_companies",
  contacts: "crm_contacts",
  deals: "crm_deals",
  tasks: "crm_tasks",
  quotes: "crm_quotes",
} as const

type PBRecord = Record<string, unknown> & {
  id: string
  created?: string
  updated?: string
  expand?: Record<string, unknown>
}

type ListParams = {
  search?: string
  page?: number
  pageSize?: number
  stage?: string
  status?: string
  company?: string
}

export type CompanyInput = Omit<Company, "id" | "createdAt" | "updatedAt">
export type ContactInput = Omit<Contact, "id" | "createdAt" | "updatedAt" | "companyName">
export type DealInput = Omit<Deal, "id" | "createdAt" | "updatedAt" | "companyName" | "contactName">
export type TaskInput = Omit<CrmTask, "id" | "createdAt" | "updatedAt" | "companyName" | "dealTitle">
export type QuoteInput = Omit<Quote, "id" | "createdAt" | "updatedAt" | "companyName" | "dealTitle">

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function dateText(record: PBRecord, field: "created" | "updated"): string {
  return text(record[field], new Date().toISOString())
}

function escapeFilter(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function expandedName(record: PBRecord, key: string, fallbackKey = "name"): string {
  const value = record.expand?.[key]
  if (!value || typeof value !== "object") return ""
  return text((value as Record<string, unknown>)[fallbackKey])
}

function filterText(fields: string[], search?: string): string {
  if (!search?.trim()) return ""
  const query = escapeFilter(search.trim())
  return fields.map((field) => `${field}~"${query}"`).join("||")
}

function joinFilters(values: string[]): string {
  return values.filter(Boolean).join("&&")
}

function mapCompany(record: unknown): Company {
  const row = record as PBRecord
  return {
    id: row.id,
    name: text(row.name),
    industry: text(row.industry),
    owner: text(row.owner),
    website: text(row.website),
    size: text(row.size),
    health: text(row.health, "green"),
    createdAt: dateText(row, "created"),
    updatedAt: dateText(row, "updated"),
  }
}

function mapContact(record: unknown): Contact {
  const row = record as PBRecord
  return {
    id: row.id,
    name: text(row.name),
    email: text(row.email),
    phone: text(row.phone),
    title: text(row.title),
    owner: text(row.owner),
    company: text(row.company),
    companyName: expandedName(row, "company"),
    lastContactedAt: text(row.lastContactedAt),
    createdAt: dateText(row, "created"),
    updatedAt: dateText(row, "updated"),
  }
}

function mapDeal(record: unknown): Deal {
  const row = record as PBRecord
  const stage = DEAL_STAGES.includes(row.stage as DealStage) ? (row.stage as DealStage) : "lead"
  return {
    id: row.id,
    title: text(row.title),
    value: number(row.value),
    stage,
    probability: number(row.probability),
    owner: text(row.owner),
    company: text(row.company),
    companyName: expandedName(row, "company"),
    contact: text(row.contact),
    contactName: expandedName(row, "contact"),
    closeDate: text(row.closeDate),
    nextStep: text(row.nextStep),
    createdAt: dateText(row, "created"),
    updatedAt: dateText(row, "updated"),
  }
}

function mapTask(record: unknown): CrmTask {
  const row = record as PBRecord
  const status = ["todo", "doing", "done", "blocked"].includes(text(row.status))
    ? (row.status as TaskStatus)
    : "todo"
  return {
    id: row.id,
    title: text(row.title),
    status,
    dueDate: text(row.dueDate),
    owner: text(row.owner),
    company: text(row.company),
    companyName: expandedName(row, "company"),
    deal: text(row.deal),
    dealTitle: expandedName(row, "deal", "title"),
    memo: text(row.memo),
    createdAt: dateText(row, "created"),
    updatedAt: dateText(row, "updated"),
  }
}

function mapQuote(record: unknown): Quote {
  const row = record as PBRecord
  return {
    id: row.id,
    title: text(row.title),
    status: text(row.status, "draft") as Quote["status"],
    amount: number(row.amount),
    owner: text(row.owner),
    company: text(row.company),
    companyName: expandedName(row, "company"),
    deal: text(row.deal),
    dealTitle: expandedName(row, "deal", "title"),
    expiresAt: text(row.expiresAt),
    memo: text(row.memo),
    createdAt: dateText(row, "created"),
    updatedAt: dateText(row, "updated"),
  }
}

async function getList<T>(
  collection: string,
  mapper: (record: unknown) => T,
  params: ListParams,
  filter: string,
  expand?: string,
): Promise<ListResult<T>> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? CRM_APP.pageSize
  const result = await pb.collection(collection).getList(page, pageSize, {
    sort: "-updated",
    filter,
    expand,
    $autoCancel: false,
  })
  return {
    items: result.items.map(mapper),
    total: result.totalItems,
    totalPages: result.totalPages,
  }
}

export async function listCompanies(params: ListParams = {}): Promise<ListResult<Company>> {
  const filter = joinFilters([
    filterText(["name", "industry", "owner"], params.search),
    params.company ? `id="${escapeFilter(params.company)}"` : "",
  ])
  return getList(CRM_COLLECTIONS.companies, mapCompany, params, filter)
}

export async function saveCompany(input: CompanyInput, id?: string): Promise<Company> {
  const saved = id
    ? await pb.collection(CRM_COLLECTIONS.companies).update(id, input, { $autoCancel: false })
    : await pb.collection(CRM_COLLECTIONS.companies).create(input, { $autoCancel: false })
  return mapCompany(saved)
}

export async function deleteCompany(id: string): Promise<void> {
  await pb.collection(CRM_COLLECTIONS.companies).delete(id, { $autoCancel: false })
}

export async function companyOptions(): Promise<Option[]> {
  const rows = await pb.collection(CRM_COLLECTIONS.companies).getFullList({ sort: "name", $autoCancel: false })
  return rows.map((row) => ({ id: row.id, label: text(row.name) }))
}

export async function listContacts(params: ListParams = {}): Promise<ListResult<Contact>> {
  const filter = joinFilters([
    filterText(["name", "email", "phone", "title", "owner"], params.search),
    params.company ? `company="${escapeFilter(params.company)}"` : "",
  ])
  return getList(CRM_COLLECTIONS.contacts, mapContact, params, filter, "company")
}

export async function saveContact(input: ContactInput, id?: string): Promise<Contact> {
  const options = { expand: "company", $autoCancel: false }
  const saved = id
    ? await pb.collection(CRM_COLLECTIONS.contacts).update(id, input, options)
    : await pb.collection(CRM_COLLECTIONS.contacts).create(input, options)
  return mapContact(saved)
}

export async function deleteContact(id: string): Promise<void> {
  await pb.collection(CRM_COLLECTIONS.contacts).delete(id, { $autoCancel: false })
}

export async function contactOptions(): Promise<Option[]> {
  const rows = await pb.collection(CRM_COLLECTIONS.contacts).getFullList({ sort: "name", $autoCancel: false })
  return rows.map((row) => ({ id: row.id, label: text(row.name) }))
}

export async function listDeals(params: ListParams = {}): Promise<ListResult<Deal>> {
  const filter = joinFilters([
    filterText(["title", "owner", "nextStep"], params.search),
    params.stage ? `stage="${escapeFilter(params.stage)}"` : "",
    params.company ? `company="${escapeFilter(params.company)}"` : "",
  ])
  return getList(CRM_COLLECTIONS.deals, mapDeal, params, filter, "company,contact")
}

export async function allDeals(): Promise<Deal[]> {
  const rows = await pb.collection(CRM_COLLECTIONS.deals).getFullList({
    sort: "-updated",
    expand: "company,contact",
    $autoCancel: false,
  })
  return rows.map(mapDeal)
}

export async function saveDeal(input: DealInput, id?: string): Promise<Deal> {
  const options = { expand: "company,contact", $autoCancel: false }
  const saved = id
    ? await pb.collection(CRM_COLLECTIONS.deals).update(id, input, options)
    : await pb.collection(CRM_COLLECTIONS.deals).create(input, options)
  return mapDeal(saved)
}

export async function moveDealStage(id: string, stage: DealStage): Promise<void> {
  await pb.collection(CRM_COLLECTIONS.deals).update(id, { stage }, { $autoCancel: false })
}

export async function deleteDeal(id: string): Promise<void> {
  await pb.collection(CRM_COLLECTIONS.deals).delete(id, { $autoCancel: false })
}

export async function dealOptions(): Promise<Option[]> {
  const rows = await pb.collection(CRM_COLLECTIONS.deals).getFullList({ sort: "title", $autoCancel: false })
  return rows.map((row) => ({ id: row.id, label: text(row.title) }))
}

export async function listTasks(params: ListParams = {}): Promise<ListResult<CrmTask>> {
  const filter = joinFilters([
    filterText(["title", "owner", "memo"], params.search),
    params.status ? `status="${escapeFilter(params.status)}"` : "",
    params.company ? `company="${escapeFilter(params.company)}"` : "",
  ])
  return getList(CRM_COLLECTIONS.tasks, mapTask, params, filter, "company,deal")
}

export async function saveTask(input: TaskInput, id?: string): Promise<CrmTask> {
  const options = { expand: "company,deal", $autoCancel: false }
  const saved = id
    ? await pb.collection(CRM_COLLECTIONS.tasks).update(id, input, options)
    : await pb.collection(CRM_COLLECTIONS.tasks).create(input, options)
  return mapTask(saved)
}

export async function deleteTask(id: string): Promise<void> {
  await pb.collection(CRM_COLLECTIONS.tasks).delete(id, { $autoCancel: false })
}

export async function listQuotes(params: ListParams = {}): Promise<ListResult<Quote>> {
  const filter = joinFilters([
    filterText(["title", "owner", "memo"], params.search),
    params.status ? `status="${escapeFilter(params.status)}"` : "",
    params.company ? `company="${escapeFilter(params.company)}"` : "",
  ])
  return getList(CRM_COLLECTIONS.quotes, mapQuote, params, filter, "company,deal")
}

export async function saveQuote(input: QuoteInput, id?: string): Promise<Quote> {
  const options = { expand: "company,deal", $autoCancel: false }
  const saved = id
    ? await pb.collection(CRM_COLLECTIONS.quotes).update(id, input, options)
    : await pb.collection(CRM_COLLECTIONS.quotes).create(input, options)
  return mapQuote(saved)
}

export async function deleteQuote(id: string): Promise<void> {
  await pb.collection(CRM_COLLECTIONS.quotes).delete(id, { $autoCancel: false })
}

export async function dashboardSummary(): Promise<DashboardSummary> {
  const [companies, contacts, deals, tasks, quotes] = await Promise.all([
    pb.collection(CRM_COLLECTIONS.companies).getList(1, 1, { $autoCancel: false }),
    pb.collection(CRM_COLLECTIONS.contacts).getList(1, 1, { $autoCancel: false }),
    allDeals(),
    pb.collection(CRM_COLLECTIONS.tasks).getFullList({ sort: "dueDate", expand: "company,deal", $autoCancel: false }),
    pb.collection(CRM_COLLECTIONS.quotes).getFullList({ sort: "-updated", expand: "company,deal", $autoCancel: false }),
  ])
  const stageCounts = DEAL_STAGES.reduce(
    (acc, stage) => ({ ...acc, [stage]: 0 }),
    {} as Record<DealStage, number>,
  )
  let pipelineValue = 0
  let weightedPipeline = 0
  let wonValue = 0
  for (const deal of deals) {
    stageCounts[deal.stage] += 1
    if (deal.stage === "won") wonValue += deal.value
    if (deal.stage !== "won" && deal.stage !== "lost") {
      pipelineValue += deal.value
      weightedPipeline += Math.round(deal.value * (deal.probability / 100))
    }
  }
  const today = new Date().toISOString().slice(0, 10)
  const mappedTasks = tasks.map(mapTask)
  const mappedQuotes = quotes.map(mapQuote)
  return {
    companies: companies.totalItems,
    contacts: contacts.totalItems,
    openDeals: deals.filter((deal) => deal.stage !== "won" && deal.stage !== "lost").length,
    pipelineValue,
    weightedPipeline,
    wonValue,
    overdueTasks: mappedTasks.filter((task) => task.status !== "done" && task.dueDate && task.dueDate < today).length,
    openQuotes: mappedQuotes.filter((quote) => quote.status === "draft" || quote.status === "sent").length,
    stageCounts,
    recentDeals: deals.slice(0, 5),
    dueTasks: mappedTasks.filter((task) => task.status !== "done").slice(0, 6),
    activeQuotes: mappedQuotes.filter((quote) => quote.status === "draft" || quote.status === "sent").slice(0, 5),
  }
}
