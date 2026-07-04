import pb from '@/lib/miso-sdk/runtime-client'

export const USER_STATUSES = ['active', 'inactive', 'invited', 'suspended'] as const
export const USER_ROLES = ['owner', 'admin', 'manager', 'operator', 'viewer'] as const
export const USER_DEPARTMENTS = ['Operations', 'Product', 'Engineering', 'Design', 'SRE', 'Support'] as const

export type UserStatus = typeof USER_STATUSES[number]
export type UserRole = typeof USER_ROLES[number]
export type UserDepartment = typeof USER_DEPARTMENTS[number]

export type AdminUser = {
  id: string
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber: string
  status: UserStatus
  role: UserRole
  department: UserDepartment
  created: string
  updated: string
}

export type UserInput = {
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber: string
  status: UserStatus
  role: UserRole
  department: UserDepartment
}

export type UserFilters = {
  search?: string
  status?: string
  role?: string
  department?: string
}

export type UserListResult = {
  items: AdminUser[]
  totalItems: number
  totalPages: number
}

type PocketBaseListResult<T> = {
  items: T[]
  totalItems: number
  totalPages: number
}

const COLLECTION = 'admin_users'

export const defaultUserInput: UserInput = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phoneNumber: '',
  status: 'active',
  role: 'operator',
  department: 'Operations',
}

export const fallbackUsers: AdminUser[] = [
  { id: 'user-ally', firstName: 'Ally', lastName: 'Kim', username: 'ally', email: 'ally@miso.local', phoneNumber: '+82-10-1000-1001', status: 'active', role: 'admin', department: 'Operations', created: '2026-07-01 09:00:00', updated: '2026-07-01 09:00:00' },
  { id: 'user-young', firstName: 'Young', lastName: 'Lee', username: 'young', email: 'young@miso.local', phoneNumber: '+82-10-1000-1002', status: 'active', role: 'owner', department: 'Product', created: '2026-07-01 09:05:00', updated: '2026-07-01 09:05:00' },
  { id: 'user-eugene', firstName: 'Eugene', lastName: 'Park', username: 'eugene', email: 'eugene@miso.local', phoneNumber: '+82-10-1000-1003', status: 'active', role: 'admin', department: 'Engineering', created: '2026-07-01 09:10:00', updated: '2026-07-01 09:10:00' },
  { id: 'user-kade', firstName: 'Kade', lastName: 'Choi', username: 'kade', email: 'kade@miso.local', phoneNumber: '+82-10-1000-1004', status: 'active', role: 'manager', department: 'Engineering', created: '2026-07-01 09:15:00', updated: '2026-07-01 09:15:00' },
  { id: 'user-han', firstName: 'Han', lastName: 'Jung', username: 'han', email: 'han@miso.local', phoneNumber: '+82-10-1000-1005', status: 'invited', role: 'manager', department: 'SRE', created: '2026-07-01 09:20:00', updated: '2026-07-01 09:20:00' },
  { id: 'user-heather', firstName: 'Heather', lastName: 'Kang', username: 'heather', email: 'heather@miso.local', phoneNumber: '+82-10-1000-1006', status: 'active', role: 'operator', department: 'Design', created: '2026-07-01 09:25:00', updated: '2026-07-01 09:25:00' },
  { id: 'user-mina', firstName: 'Mina', lastName: 'Seo', username: 'mina', email: 'mina@miso.local', phoneNumber: '+82-10-1000-1007', status: 'inactive', role: 'viewer', department: 'Support', created: '2026-07-01 09:30:00', updated: '2026-07-01 09:30:00' },
]

function collectionName() {
  return import.meta.env.VITE_ADMIN_USERS_COLLECTION || COLLECTION
}

function hasValue<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value)
}

function normalizeRecord(record: Partial<AdminUser> & { id?: string }): AdminUser {
  const firstName = String(record.firstName || '').trim()
  const lastName = String(record.lastName || '').trim()
  const username = String(record.username || [firstName, lastName].filter(Boolean).join('.').toLowerCase() || 'operator').trim()
  return {
    id: record.id || crypto.randomUUID(),
    firstName: firstName || 'Unnamed',
    lastName,
    username,
    email: String(record.email || username + '@miso.local'),
    phoneNumber: String(record.phoneNumber || ''),
    status: hasValue(USER_STATUSES, record.status) ? record.status : 'invited',
    role: hasValue(USER_ROLES, record.role) ? record.role : 'operator',
    department: hasValue(USER_DEPARTMENTS, record.department) ? record.department : 'Operations',
    created: record.created || '',
    updated: record.updated || '',
  }
}

function escapeFilter(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function buildFilter(filters: UserFilters) {
  const parts: string[] = []
  const search = filters.search?.trim()
  if (search) {
    const s = escapeFilter(search)
    parts.push('(firstName ~ "' + s + '" || lastName ~ "' + s + '" || username ~ "' + s + '" || email ~ "' + s + '" || department ~ "' + s + '")')
  }
  if (filters.status) parts.push('status = "' + escapeFilter(filters.status) + '"')
  if (filters.role) parts.push('role = "' + escapeFilter(filters.role) + '"')
  if (filters.department) parts.push('department = "' + escapeFilter(filters.department) + '"')
  return parts.join(' && ')
}

function filterFallback(filters: UserFilters) {
  const q = filters.search?.trim().toLowerCase()
  return fallbackUsers.filter((user) => {
    if (q && ![user.firstName, user.lastName, user.username, user.email, user.department].join(' ').toLowerCase().includes(q)) return false
    if (filters.status && user.status !== filters.status) return false
    if (filters.role && user.role !== filters.role) return false
    if (filters.department && user.department !== filters.department) return false
    return true
  })
}

export async function listUsers(filters: UserFilters = {}): Promise<UserListResult> {
  try {
    const result = await pb.collection(collectionName()).getList(1, 200, {
      sort: 'firstName,lastName',
      filter: buildFilter(filters),
      requestKey: null,
    }) as PocketBaseListResult<Partial<AdminUser>>
    return {
      items: result.items.map(normalizeRecord),
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    }
  } catch (error) {
    console.warn('[admin] PocketBase user list failed, using fallback users', error)
    const items = filterFallback(filters)
    return { items, totalItems: items.length, totalPages: 1 }
  }
}

export async function createUser(input: UserInput): Promise<AdminUser> {
  const record = await pb.collection(collectionName()).create(input, { requestKey: null }) as Partial<AdminUser>
  return normalizeRecord(record)
}

export async function updateUser(id: string, input: UserInput): Promise<AdminUser> {
  const record = await pb.collection(collectionName()).update(id, input, { requestKey: null }) as Partial<AdminUser>
  return normalizeRecord(record)
}

export async function updateUsersStatus(ids: string[], status: UserStatus): Promise<void> {
  for (const id of ids) {
    await pb.collection(collectionName()).update(id, { status }, { requestKey: null })
  }
}

export async function deleteUser(id: string): Promise<void> {
  await pb.collection(collectionName()).delete(id, { requestKey: null })
}

export async function deleteUsers(ids: string[]): Promise<void> {
  for (const id of ids) await deleteUser(id)
}
