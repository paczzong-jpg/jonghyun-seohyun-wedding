import type { LucideIcon } from 'lucide-react'
import { AlertCircle, CheckCircle2, Circle, Clock3, Ellipsis, Flame, Gauge, HelpCircle, LoaderCircle, PauseCircle, SignalHigh, SignalLow, SignalMedium, Sparkles } from 'lucide-react'

export const ISSUE_STATUSES = ['backlog', 'todo', 'in-progress', 'review', 'done'] as const
export const ISSUE_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export const PROJECT_STATUSES = ['planned', 'active', 'paused', 'completed'] as const
export const PROJECT_HEALTH = ['no-update', 'on-track', 'at-risk', 'off-track'] as const
export const MEMBER_STATUSES = ['online', 'away', 'offline'] as const

export type IssueStatus = typeof ISSUE_STATUSES[number]
export type IssuePriority = typeof ISSUE_PRIORITIES[number]
export type ProjectStatus = typeof PROJECT_STATUSES[number]
export type ProjectHealth = typeof PROJECT_HEALTH[number]
export type MemberStatus = typeof MEMBER_STATUSES[number]

export type ProjectMember = {
  id: string
  key: string
  name: string
  email: string
  role: string
  status: MemberStatus
  initials: string
  joinedDate: string
  teamKeys: string[]
}

export type ProjectTeam = {
  id: string
  key: string
  name: string
  icon: string
  joined: boolean
  tone: 'primary' | 'blue' | 'violet' | 'rose' | 'amber'
  memberKeys: string[]
  projectKeys: string[]
}

export type ProjectRecord = {
  id: string
  key: string
  name: string
  status: ProjectStatus
  health: ProjectHealth
  priority: IssuePriority
  lead: string
  percentComplete: number
  targetDate: string
  description: string
  created: string
  updated: string
}

export type ProjectIssue = {
  id: string
  identifier: string
  title: string
  description: string
  status: IssueStatus
  priority: IssuePriority
  assignee: string
  teamKey: string
  projectKey: string
  label: string
  dueDate: string
  rank: string
  created: string
  updated: string
}

export type ProjectInboxItem = {
  id: string
  title: string
  issueIdentifier: string
  kind: 'status' | 'mention' | 'due-date'
  actor: string
  read: boolean
  createdAt: string
}

export type ProjectManagementData = {
  issues: ProjectIssue[]
  projects: ProjectRecord[]
  teams: ProjectTeam[]
  members: ProjectMember[]
  inbox: ProjectInboxItem[]
}

export const statusMeta: Record<IssueStatus, { label: string; icon: LucideIcon }> = {
  backlog: { label: 'Backlog', icon: Ellipsis },
  todo: { label: 'Todo', icon: Circle },
  'in-progress': { label: 'In Progress', icon: LoaderCircle },
  review: { label: 'Review', icon: Clock3 },
  done: { label: 'Done', icon: CheckCircle2 },
}

export const priorityMeta: Record<IssuePriority, { label: string; icon: LucideIcon }> = {
  low: { label: 'Low', icon: SignalLow },
  medium: { label: 'Medium', icon: SignalMedium },
  high: { label: 'High', icon: SignalHigh },
  urgent: { label: 'Urgent', icon: Flame },
}

export const projectStatusMeta: Record<ProjectStatus, { label: string; icon: LucideIcon }> = {
  planned: { label: 'Planned', icon: Clock3 },
  active: { label: 'Active', icon: LoaderCircle },
  paused: { label: 'Paused', icon: PauseCircle },
  completed: { label: 'Completed', icon: CheckCircle2 },
}

export const healthMeta: Record<ProjectHealth, { label: string; icon: LucideIcon }> = {
  'no-update': { label: 'No Update', icon: HelpCircle },
  'on-track': { label: 'On Track', icon: CheckCircle2 },
  'at-risk': { label: 'At Risk', icon: AlertCircle },
  'off-track': { label: 'Off Track', icon: Gauge },
}

export const teamToneClass: Record<ProjectTeam['tone'], string> = {
  primary: 'bg-primary text-primary-foreground',
  blue: 'bg-sky-500 text-white',
  violet: 'bg-violet-500 text-white',
  rose: 'bg-rose-500 text-white',
  amber: 'bg-amber-500 text-white',
}

export const fallbackMembers: ProjectMember[] = [
  { id: 'seed-ally', key: 'ally', name: 'Ally', email: 'ally@miso.local', role: 'Operations', status: 'online', initials: 'AL', joinedDate: '2026-01-12', teamKeys: ['OPS', 'PRODUCT'] },
  { id: 'seed-young', key: 'young', name: 'Young', email: 'young@miso.local', role: '기획자 · MISO PO', status: 'online', initials: 'YO', joinedDate: '2026-01-03', teamKeys: ['PRODUCT', 'DESIGN'] },
  { id: 'seed-eugene', key: 'eugene', name: 'Eugene', email: 'eugene@miso.local', role: 'FE 개발', status: 'away', initials: 'EU', joinedDate: '2026-02-10', teamKeys: ['WEB', 'DESIGN'] },
  { id: 'seed-kade', key: 'kade', name: 'Kade', email: 'kade@miso.local', role: 'BE 개발', status: 'online', initials: 'KA', joinedDate: '2026-02-18', teamKeys: ['PLATFORM', 'OPS'] },
  { id: 'seed-han', key: 'han', name: 'Han', email: 'han@miso.local', role: 'SRE', status: 'offline', initials: 'HA', joinedDate: '2026-03-04', teamKeys: ['PLATFORM', 'OPS'] },
  { id: 'seed-heather', key: 'heather', name: 'Heather', email: 'heather@miso.local', role: 'UI/UX', status: 'online', initials: 'HE', joinedDate: '2026-03-14', teamKeys: ['DESIGN', 'PRODUCT'] },
]

export const fallbackTeams: ProjectTeam[] = [
  { id: 'seed-product', key: 'PRODUCT', name: 'Product', icon: 'P', joined: true, tone: 'primary', memberKeys: ['ally', 'young', 'heather'], projectKeys: ['pm-admin', 'live-event'] },
  { id: 'seed-web', key: 'WEB', name: 'Web', icon: 'W', joined: true, tone: 'blue', memberKeys: ['eugene', 'heather'], projectKeys: ['pm-admin', 'chat-service'] },
  { id: 'seed-platform', key: 'PLATFORM', name: 'Platform', icon: 'F', joined: true, tone: 'violet', memberKeys: ['kade', 'han'], projectKeys: ['pb-runtime', 'chat-service'] },
  { id: 'seed-design', key: 'DESIGN', name: 'Design', icon: 'D', joined: true, tone: 'rose', memberKeys: ['young', 'eugene', 'heather'], projectKeys: ['live-event', 'pm-admin'] },
  { id: 'seed-ops', key: 'OPS', name: 'Operations', icon: 'O', joined: false, tone: 'amber', memberKeys: ['ally', 'kade', 'han'], projectKeys: ['pb-runtime'] },
]

export const fallbackProjects: ProjectRecord[] = [
  { id: 'seed-pm-admin', key: 'pm-admin', name: 'Project Management Boilerplate', status: 'active', health: 'on-track', priority: 'high', lead: 'Eugene', percentComplete: 72, targetDate: '2026-07-08', description: 'Vite and PocketBase project workspace based on Circle.', created: '2026-07-01 09:00:00', updated: '2026-07-01 09:00:00' },
  { id: 'seed-pb-runtime', key: 'pb-runtime', name: 'PocketBase Runtime Schema', status: 'active', health: 'at-risk', priority: 'urgent', lead: 'Kade', percentComplete: 56, targetDate: '2026-07-05', description: 'Schema setup, JSVM hooks, realtime-safe data model.', created: '2026-07-01 09:05:00', updated: '2026-07-01 09:05:00' },
  { id: 'seed-chat-service', key: 'chat-service', name: 'Advanced Chat Service', status: 'planned', health: 'no-update', priority: 'medium', lead: 'Young', percentComplete: 18, targetDate: '2026-07-18', description: 'Conversation isolation, agent handoff, direct LLM support.', created: '2026-07-01 09:10:00', updated: '2026-07-01 09:10:00' },
  { id: 'seed-live-event', key: 'live-event', name: 'Live Event Console', status: 'active', health: 'on-track', priority: 'medium', lead: 'Heather', percentComplete: 64, targetDate: '2026-07-12', description: 'QR entry, realtime quiz, Q&A, and prize draw.', created: '2026-07-01 09:15:00', updated: '2026-07-01 09:15:00' },
]

export const fallbackIssues: ProjectIssue[] = [
  { id: 'seed-501', identifier: 'MISO-501', title: 'Port Circle workspace shell to Vite', description: 'Keep compact Linear-style navigation and remove Next-specific surfaces.', status: 'done', priority: 'high', assignee: 'Eugene', teamKey: 'WEB', projectKey: 'pm-admin', label: 'Frontend', dueDate: '2026-07-02', rank: 'miso-0001', created: '2026-07-01 09:20:00', updated: '2026-07-01 09:20:00' },
  { id: 'seed-502', identifier: 'MISO-502', title: 'Add PocketBase collections for issues and projects', description: 'Create setup script and PB v0.31 compatible hooks.', status: 'in-progress', priority: 'urgent', assignee: 'Kade', teamKey: 'PLATFORM', projectKey: 'pb-runtime', label: 'Runtime', dueDate: '2026-07-03', rank: 'miso-0002', created: '2026-07-01 09:25:00', updated: '2026-07-01 09:25:00' },
  { id: 'seed-503', identifier: 'MISO-503', title: 'Design issue board and dense list states', description: 'Preserve Circle density while using managed shadcn components.', status: 'review', priority: 'high', assignee: 'Heather', teamKey: 'DESIGN', projectKey: 'pm-admin', label: 'Design', dueDate: '2026-07-04', rank: 'miso-0003', created: '2026-07-01 09:30:00', updated: '2026-07-01 09:30:00' },
  { id: 'seed-504', identifier: 'MISO-504', title: 'Clarify selective overlay README instructions', description: 'Document shell, issue workspace, projects, teams, and inbox slices.', status: 'todo', priority: 'medium', assignee: 'Young', teamKey: 'PRODUCT', projectKey: 'pm-admin', label: 'Docs', dueDate: '2026-07-05', rank: 'miso-0004', created: '2026-07-01 09:35:00', updated: '2026-07-01 09:35:00' },
  { id: 'seed-505', identifier: 'MISO-505', title: 'Verify generated app build after overlay', description: 'Run a production Vite build against a copied app template.', status: 'todo', priority: 'medium', assignee: 'Han', teamKey: 'OPS', projectKey: 'pb-runtime', label: 'QA', dueDate: '2026-07-06', rank: 'miso-0005', created: '2026-07-01 09:40:00', updated: '2026-07-01 09:40:00' },
  { id: 'seed-506', identifier: 'MISO-506', title: 'Create live event project rollup', description: 'Link Q&A, quiz, and prize draw tasks to a single project view.', status: 'backlog', priority: 'low', assignee: 'Ally', teamKey: 'PRODUCT', projectKey: 'live-event', label: 'Operations', dueDate: '2026-07-10', rank: 'miso-0006', created: '2026-07-01 09:45:00', updated: '2026-07-01 09:45:00' },
  { id: 'seed-507', identifier: 'MISO-507', title: 'Add chat service conversation ownership model', description: 'Keep user isolation, provider mode, and tool route examples aligned.', status: 'backlog', priority: 'medium', assignee: 'Kade', teamKey: 'PLATFORM', projectKey: 'chat-service', label: 'Backend', dueDate: '2026-07-13', rank: 'miso-0007', created: '2026-07-01 09:50:00', updated: '2026-07-01 09:50:00' },
  { id: 'seed-508', identifier: 'MISO-508', title: 'Tune mobile issue list density', description: 'Keep row content readable without turning issue lists into cards.', status: 'in-progress', priority: 'medium', assignee: 'Eugene', teamKey: 'WEB', projectKey: 'pm-admin', label: 'Mobile', dueDate: '2026-07-07', rank: 'miso-0008', created: '2026-07-01 09:55:00', updated: '2026-07-01 09:55:00' },
]

export const fallbackInbox: ProjectInboxItem[] = [
  { id: 'seed-inbox-1', title: 'Kade moved MISO-502 to In Progress', issueIdentifier: 'MISO-502', kind: 'status', actor: 'Kade', read: false, createdAt: '2026-07-01 09:20:00' },
  { id: 'seed-inbox-2', title: 'Heather requested design review on MISO-503', issueIdentifier: 'MISO-503', kind: 'mention', actor: 'Heather', read: false, createdAt: '2026-07-01 10:10:00' },
  { id: 'seed-inbox-3', title: 'MISO-505 is due this week', issueIdentifier: 'MISO-505', kind: 'due-date', actor: 'System', read: true, createdAt: '2026-07-01 11:00:00' },
]

export const fallbackProjectData: ProjectManagementData = {
  issues: fallbackIssues,
  projects: fallbackProjects,
  teams: fallbackTeams,
  members: fallbackMembers,
  inbox: fallbackInbox,
}
