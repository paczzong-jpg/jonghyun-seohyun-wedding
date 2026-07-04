import pb from '@/lib/miso-sdk/runtime-client'

export const TASK_STATUSES = ['대기', '진행중', '완료', '보류'] as const
export const TASK_PRIORITIES = ['낮음', '보통', '높음', '긴급'] as const
export const TASK_CATEGORIES = ['개발', '디자인', '기획', '운영', '고객지원'] as const
export const TASK_OWNERS = ['Ally', 'Young', 'Eugene', 'Kade', 'Han', 'Heather'] as const

export type TaskStatus = typeof TASK_STATUSES[number]
export type TaskPriority = typeof TASK_PRIORITIES[number]
export type TaskCategory = typeof TASK_CATEGORIES[number]
export type TaskOwner = typeof TASK_OWNERS[number]

export type AdminTask = {
  id: string
  name: string
  category: TaskCategory
  status: TaskStatus
  priority: TaskPriority
  owner: TaskOwner
  amount: number
  dueDate: string
  memo: string
  created: string
  updated: string
}

export type TaskInput = {
  name: string
  category: TaskCategory
  status: TaskStatus
  priority: TaskPriority
  owner: TaskOwner
  amount: number
  dueDate: string
  memo: string
}

export type TaskFilters = {
  search?: string
  status?: string
  category?: string
  priority?: string
  owner?: string
  dateFrom?: string
  dateTo?: string
}

export type TaskListResult = {
  items: AdminTask[]
  totalItems: number
  totalPages: number
}

type PocketBaseListResult<T> = {
  items: T[]
  totalItems: number
  totalPages: number
}

const COLLECTION = 'admin_tasks'

export const defaultTaskInput: TaskInput = {
  name: '',
  category: '운영',
  status: '대기',
  priority: '보통',
  owner: 'Ally',
  amount: 0,
  dueDate: new Date().toISOString().slice(0, 10),
  memo: '',
}

export const fallbackTasks: AdminTask[] = [
  { id: 'seed-1', name: '발행 전 회귀 테스트', category: '개발', status: '진행중', priority: '높음', owner: 'Eugene', amount: 1240000, dueDate: '2026-07-02', memo: 'preview, publish, runtime smoke', created: '2026-07-01 09:00:00', updated: '2026-07-01 09:00:00' },
  { id: 'seed-2', name: '고객사 관리자 권한 검토', category: '운영', status: '대기', priority: '보통', owner: 'Ally', amount: 640000, dueDate: '2026-07-04', memo: 'permission matrix', created: '2026-07-01 09:20:00', updated: '2026-07-01 09:20:00' },
  { id: 'seed-3', name: '이벤트 퀴즈 진행자 화면 QA', category: '디자인', status: '완료', priority: '보통', owner: 'Heather', amount: 320000, dueDate: '2026-07-01', memo: 'mobile QR entry verified', created: '2026-07-01 08:30:00', updated: '2026-07-01 10:12:00' },
  { id: 'seed-4', name: 'PocketBase hook v0.31 API 점검', category: '개발', status: '완료', priority: '긴급', owner: 'Kade', amount: 980000, dueDate: '2026-07-01', memo: 'onRecordCreateRequest only', created: '2026-07-01 07:30:00', updated: '2026-07-01 11:00:00' },
  { id: 'seed-5', name: '런타임 로그 대시보드 정리', category: '운영', status: '보류', priority: '낮음', owner: 'Han', amount: 480000, dueDate: '2026-07-08', memo: 'waiting for SRE window', created: '2026-06-30 15:10:00', updated: '2026-07-01 08:01:00' },
  { id: 'seed-6', name: 'PRD 브레인스토밍 스킬 문서 갱신', category: '기획', status: '진행중', priority: '보통', owner: 'Young', amount: 520000, dueDate: '2026-07-05', memo: 'keep only MISO PRD brainstorming', created: '2026-06-29 12:00:00', updated: '2026-07-01 09:45:00' },
]

function collectionName() {
  return import.meta.env.VITE_ADMIN_TASKS_COLLECTION || COLLECTION
}

function hasValue<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value)
}

function normalizeRecord(record: Partial<AdminTask> & { id?: string }): AdminTask {
  return {
    id: record.id || crypto.randomUUID(),
    name: record.name || 'Untitled task',
    category: hasValue(TASK_CATEGORIES, record.category) ? record.category : '운영',
    status: hasValue(TASK_STATUSES, record.status) ? record.status : '대기',
    priority: hasValue(TASK_PRIORITIES, record.priority) ? record.priority : '보통',
    owner: hasValue(TASK_OWNERS, record.owner) ? record.owner : 'Ally',
    amount: Number(record.amount || 0),
    dueDate: record.dueDate || '',
    memo: record.memo || '',
    created: record.created || '',
    updated: record.updated || '',
  }
}

function escapeFilter(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function buildFilter(filters: TaskFilters) {
  const parts: string[] = []
  const search = filters.search?.trim()
  if (search) {
    const s = escapeFilter(search)
    parts.push('(name ~ "' + s + '" || memo ~ "' + s + '" || owner ~ "' + s + '")')
  }
  if (filters.status) parts.push('status = "' + escapeFilter(filters.status) + '"')
  if (filters.category) parts.push('category = "' + escapeFilter(filters.category) + '"')
  if (filters.priority) parts.push('priority = "' + escapeFilter(filters.priority) + '"')
  if (filters.owner) parts.push('owner = "' + escapeFilter(filters.owner) + '"')
  if (filters.dateFrom) parts.push('dueDate >= "' + escapeFilter(filters.dateFrom) + '"')
  if (filters.dateTo) parts.push('dueDate <= "' + escapeFilter(filters.dateTo) + '"')
  return parts.join(' && ')
}

function filterFallback(filters: TaskFilters) {
  const q = filters.search?.trim().toLowerCase()
  return fallbackTasks.filter((task) => {
    if (q && ![task.name, task.memo, task.owner].join(' ').toLowerCase().includes(q)) return false
    if (filters.status && task.status !== filters.status) return false
    if (filters.category && task.category !== filters.category) return false
    if (filters.priority && task.priority !== filters.priority) return false
    if (filters.owner && task.owner !== filters.owner) return false
    if (filters.dateFrom && task.dueDate < filters.dateFrom) return false
    if (filters.dateTo && task.dueDate > filters.dateTo) return false
    return true
  })
}

export async function listTasks(filters: TaskFilters = {}): Promise<TaskListResult> {
  try {
    const result = await pb.collection(collectionName()).getList(1, 200, {
      sort: '-created',
      filter: buildFilter(filters),
      requestKey: null,
    }) as PocketBaseListResult<Partial<AdminTask>>
    return {
      items: result.items.map(normalizeRecord),
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    }
  } catch (error) {
    console.warn('[admin] PocketBase list failed, using fallback tasks', error)
    const items = filterFallback(filters)
    return { items, totalItems: items.length, totalPages: 1 }
  }
}

export async function createTask(input: TaskInput): Promise<AdminTask> {
  const record = await pb.collection(collectionName()).create(input, { requestKey: null }) as Partial<AdminTask>
  return normalizeRecord(record)
}

export async function updateTask(id: string, input: TaskInput): Promise<AdminTask> {
  const record = await pb.collection(collectionName()).update(id, input, { requestKey: null }) as Partial<AdminTask>
  return normalizeRecord(record)
}

export async function deleteTask(id: string): Promise<void> {
  await pb.collection(collectionName()).delete(id, { requestKey: null })
}

export async function deleteTasks(ids: string[]): Promise<void> {
  for (const id of ids) await deleteTask(id)
}

export async function updateTasksStatus(ids: string[], status: TaskStatus): Promise<void> {
  for (const id of ids) {
    await pb.collection(collectionName()).update(id, { status }, { requestKey: null })
  }
}

export async function updateTasksPriority(ids: string[], priority: TaskPriority): Promise<void> {
  for (const id of ids) {
    await pb.collection(collectionName()).update(id, { priority }, { requestKey: null })
  }
}
