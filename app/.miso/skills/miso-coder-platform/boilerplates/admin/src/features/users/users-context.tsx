import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AdminUser } from '@/lib/admin-users'

type UserDialog = 'invite' | 'create' | 'edit' | 'delete' | 'bulk-delete' | null

type UsersContextValue = {
  open: UserDialog
  setOpen: (open: UserDialog) => void
  currentUser: AdminUser | null
  setCurrentUser: (user: AdminUser | null) => void
  bulkUserIds: string[]
  setBulkUserIds: (ids: string[]) => void
}

const UsersContext = createContext<UsersContextValue | null>(null)

export function UsersProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<UserDialog>(null)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [bulkUserIds, setBulkUserIds] = useState<string[]>([])
  const value = useMemo(() => ({ open, setOpen, currentUser, setCurrentUser, bulkUserIds, setBulkUserIds }), [open, currentUser, bulkUserIds])
  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>
}

export function useUsers() {
  const context = useContext(UsersContext)
  if (!context) throw new Error('useUsers must be used inside UsersProvider')
  return context
}
