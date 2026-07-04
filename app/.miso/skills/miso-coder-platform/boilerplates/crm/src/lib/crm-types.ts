export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost"
export type TaskStatus = "todo" | "doing" | "done" | "blocked"
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined"

export type Company = {
  id: string
  name: string
  industry: string
  owner: string
  website: string
  size: string
  health: string
  createdAt: string
  updatedAt: string
}

export type Contact = {
  id: string
  name: string
  email: string
  phone: string
  title: string
  owner: string
  company: string
  companyName: string
  lastContactedAt: string
  createdAt: string
  updatedAt: string
}

export type Deal = {
  id: string
  title: string
  value: number
  stage: DealStage
  probability: number
  owner: string
  company: string
  companyName: string
  contact: string
  contactName: string
  closeDate: string
  nextStep: string
  createdAt: string
  updatedAt: string
}

export type CrmTask = {
  id: string
  title: string
  status: TaskStatus
  dueDate: string
  owner: string
  company: string
  companyName: string
  deal: string
  dealTitle: string
  memo: string
  createdAt: string
  updatedAt: string
}

export type Quote = {
  id: string
  title: string
  status: QuoteStatus
  amount: number
  owner: string
  company: string
  companyName: string
  deal: string
  dealTitle: string
  expiresAt: string
  memo: string
  createdAt: string
  updatedAt: string
}

export type Option = {
  id: string
  label: string
}

export type DashboardSummary = {
  companies: number
  contacts: number
  openDeals: number
  pipelineValue: number
  weightedPipeline: number
  wonValue: number
  overdueTasks: number
  openQuotes: number
  stageCounts: Record<DealStage, number>
  recentDeals: Deal[]
  dueTasks: CrmTask[]
  activeQuotes: Quote[]
}

export type ListResult<T> = {
  items: T[]
  total: number
  totalPages: number
}
