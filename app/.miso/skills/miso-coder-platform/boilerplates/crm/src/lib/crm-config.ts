import type { DealStage, QuoteStatus, TaskStatus } from "@/lib/crm-types"

export const CRM_APP = {
  title: "MISO CRM",
  subtitle: "Sales workspace",
  pageSize: 10,
} as const

export const TEAM_MEMBERS = ["Ally", "Young", "Eugene", "Kade", "Han", "Heather"] as const

export const DEAL_STAGES: DealStage[] = ["lead", "qualified", "proposal", "negotiation", "won", "lost"]

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
}

export const DEAL_STAGE_TONE: Record<DealStage, string> = {
  lead: "bg-muted text-muted-foreground",
  qualified: "bg-secondary text-secondary-foreground",
  proposal: "bg-accent text-accent-foreground",
  negotiation: "bg-primary/10 text-primary",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-destructive/10 text-destructive",
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  doing: "Doing",
  done: "Done",
  blocked: "Blocked",
}

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
}

export const INDUSTRIES = [
  "SaaS",
  "Manufacturing",
  "Finance",
  "Retail",
  "Healthcare",
  "Education",
  "Media",
  "Public",
] as const

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const
