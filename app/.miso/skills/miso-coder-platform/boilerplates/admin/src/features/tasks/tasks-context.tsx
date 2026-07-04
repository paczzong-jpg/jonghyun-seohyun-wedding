import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AdminTask } from '@/lib/admin-tasks'

type TaskDialog = 'create' | 'edit' | 'import' | 'delete' | 'bulk-delete' | null

type TasksContextValue = {
  open: TaskDialog
  setOpen: (open: TaskDialog) => void
  currentTask: AdminTask | null
  setCurrentTask: (task: AdminTask | null) => void
  bulkTaskIds: string[]
  setBulkTaskIds: (ids: string[]) => void
}

const TasksContext = createContext<TasksContextValue | null>(null)

export function TasksProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<TaskDialog>(null)
  const [currentTask, setCurrentTask] = useState<AdminTask | null>(null)
  const [bulkTaskIds, setBulkTaskIds] = useState<string[]>([])
  const value = useMemo(() => ({ open, setOpen, currentTask, setCurrentTask, bulkTaskIds, setBulkTaskIds }), [open, currentTask, bulkTaskIds])
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks() {
  const context = useContext(TasksContext)
  if (!context) throw new Error('useTasks must be used inside TasksProvider')
  return context
}
