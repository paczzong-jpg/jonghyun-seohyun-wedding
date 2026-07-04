import pb from '@/lib/miso-sdk/runtime-client'
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  MEMBER_STATUSES,
  PROJECT_HEALTH,
  PROJECT_STATUSES,
  fallbackInbox,
  fallbackIssues,
  fallbackMembers,
  fallbackProjects,
  fallbackTeams,
  type IssuePriority,
  type IssueStatus,
  type MemberStatus,
  type ProjectHealth,
  type ProjectInboxItem,
  type ProjectIssue,
  type ProjectManagementData,
  type ProjectMember,
  type ProjectRecord,
  type ProjectStatus,
  type ProjectTeam,
} from '@/lib/project-data'

type RecordShape = Record<string, unknown> & { id?: string; created?: string; updated?: string }
type ListResult<T> = { items: T[] }

const collectionNames = {
  issues: import.meta.env.VITE_PM_ISSUES_COLLECTION || 'pm_issues',
  projects: import.meta.env.VITE_PM_PROJECTS_COLLECTION || 'pm_projects',
  teams: import.meta.env.VITE_PM_TEAMS_COLLECTION || 'pm_teams',
  members: import.meta.env.VITE_PM_MEMBERS_COLLECTION || 'pm_members',
  inbox: import.meta.env.VITE_PM_INBOX_COLLECTION || 'pm_inbox',
}

export type IssueInput = {
  title: string
  description: string
  status: IssueStatus
  priority: IssuePriority
  assignee: string
  teamKey: string
  projectKey: string
  label: string
  dueDate: string
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function boolValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function enumValue<T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && values.includes(value) ? value : fallback
}

function shouldUseLocalPreviewFallback() {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false
  }
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

function normalizeIssue(record: RecordShape): ProjectIssue {
  return {
    id: record.id || crypto.randomUUID(),
    identifier: stringValue(record.identifier, 'MISO-000'),
    title: stringValue(record.title, 'Untitled issue'),
    description: stringValue(record.description),
    status: enumValue(record.status, ISSUE_STATUSES, 'todo'),
    priority: enumValue(record.priority, ISSUE_PRIORITIES, 'medium'),
    assignee: stringValue(record.assignee, 'Ally'),
    teamKey: stringValue(record.teamKey, 'PRODUCT'),
    projectKey: stringValue(record.projectKey, 'pm-admin'),
    label: stringValue(record.label, 'General'),
    dueDate: stringValue(record.dueDate),
    rank: stringValue(record.rank, record.id || 'miso-0000'),
    created: stringValue(record.created),
    updated: stringValue(record.updated),
  }
}

function normalizeProject(record: RecordShape): ProjectRecord {
  return {
    id: record.id || crypto.randomUUID(),
    key: stringValue(record.key, 'project'),
    name: stringValue(record.name, 'Untitled project'),
    status: enumValue(record.status, PROJECT_STATUSES, 'planned'),
    health: enumValue(record.health, PROJECT_HEALTH, 'no-update'),
    priority: enumValue(record.priority, ISSUE_PRIORITIES, 'medium'),
    lead: stringValue(record.lead, 'Young'),
    percentComplete: numberValue(record.percentComplete),
    targetDate: stringValue(record.targetDate),
    description: stringValue(record.description),
    created: stringValue(record.created),
    updated: stringValue(record.updated),
  }
}

function normalizeTeam(record: RecordShape): ProjectTeam {
  const tone = stringValue(record.tone, 'primary')
  const safeTone = ['primary', 'blue', 'violet', 'rose', 'amber'].includes(tone) ? tone : 'primary'
  return {
    id: record.id || crypto.randomUUID(),
    key: stringValue(record.key, 'TEAM'),
    name: stringValue(record.name, 'Team'),
    icon: stringValue(record.icon, 'T'),
    joined: boolValue(record.joined),
    tone: safeTone as ProjectTeam['tone'],
    memberKeys: stringArray(record.memberKeys),
    projectKeys: stringArray(record.projectKeys),
  }
}

function normalizeMember(record: RecordShape): ProjectMember {
  return {
    id: record.id || crypto.randomUUID(),
    key: stringValue(record.key, 'member'),
    name: stringValue(record.name, 'Member'),
    email: stringValue(record.email),
    role: stringValue(record.role, 'Member'),
    status: enumValue(record.status, MEMBER_STATUSES, 'offline'),
    initials: stringValue(record.initials, 'ME'),
    joinedDate: stringValue(record.joinedDate),
    teamKeys: stringArray(record.teamKeys),
  }
}

function normalizeInbox(record: RecordShape): ProjectInboxItem {
  const kind = stringValue(record.kind, 'status')
  return {
    id: record.id || crypto.randomUUID(),
    title: stringValue(record.title, 'Workspace activity'),
    issueIdentifier: stringValue(record.issueIdentifier),
    kind: kind === 'mention' || kind === 'due-date' ? kind : 'status',
    actor: stringValue(record.actor, 'System'),
    read: boolValue(record.read),
    createdAt: stringValue(record.createdAt, record.created || ''),
  }
}

async function listCollection<T>(name: string, normalize: (record: RecordShape) => T, fallback: T[]) {
  try {
    const result = await pb.collection(name).getList(1, 200, {
      sort: '-created',
      requestKey: null,
    }) as ListResult<RecordShape>
    if (result.items.length === 0 && fallback.length > 0 && shouldUseLocalPreviewFallback()) {
      return fallback
    }
    return result.items.map(normalize)
  } catch (error) {
    console.warn('[project-management] PocketBase list failed, using fallback data', name, error)
    return fallback
  }
}

export async function getProjectManagementData(): Promise<ProjectManagementData> {
  const [issues, projects, teams, members, inbox] = await Promise.all([
    listCollection(collectionNames.issues, normalizeIssue, fallbackIssues),
    listCollection(collectionNames.projects, normalizeProject, fallbackProjects),
    listCollection(collectionNames.teams, normalizeTeam, fallbackTeams),
    listCollection(collectionNames.members, normalizeMember, fallbackMembers),
    listCollection(collectionNames.inbox, normalizeInbox, fallbackInbox),
  ])
  return { issues, projects, teams, members, inbox }
}

export async function createIssue(input: IssueInput): Promise<ProjectIssue> {
  const identifier = 'MISO-' + String(Math.floor(500 + Math.random() * 400))
  const record = await pb.collection(collectionNames.issues).create({
    identifier,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    assignee: input.assignee,
    teamKey: input.teamKey,
    projectKey: input.projectKey,
    label: input.label,
    dueDate: input.dueDate,
    rank: 'miso-' + Date.now(),
  }, { requestKey: null }) as RecordShape
  return normalizeIssue(record)
}

export async function updateIssueStatus(id: string, status: IssueStatus): Promise<ProjectIssue> {
  const record = await pb.collection(collectionNames.issues).update(id, { status }, { requestKey: null }) as RecordShape
  return normalizeIssue(record)
}

export async function markInboxRead(id: string): Promise<ProjectInboxItem> {
  const record = await pb.collection(collectionNames.inbox).update(id, { read: true }, { requestKey: null }) as RecordShape
  return normalizeInbox(record)
}
