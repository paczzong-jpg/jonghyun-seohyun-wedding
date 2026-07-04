import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { IssuePriority, IssueStatus } from '@/lib/project-data'

type ProjectUiContextValue = {
  search: string
  setSearch: (value: string) => void
  statusFilter: IssueStatus | 'all'
  setStatusFilter: (value: IssueStatus | 'all') => void
  priorityFilter: IssuePriority | 'all'
  setPriorityFilter: (value: IssuePriority | 'all') => void
  teamFilter: string
  setTeamFilter: (value: string) => void
  createOpen: boolean
  setCreateOpen: (open: boolean) => void
}

const ProjectUiContext = createContext<ProjectUiContextValue | null>(null)

export function ProjectUiProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | 'all'>('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)

  const value = useMemo(() => ({
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    teamFilter,
    setTeamFilter,
    createOpen,
    setCreateOpen,
  }), [search, statusFilter, priorityFilter, teamFilter, createOpen])

  return <ProjectUiContext.Provider value={value}>{children}</ProjectUiContext.Provider>
}

export function useProjectUi() {
  const context = useContext(ProjectUiContext)
  if (!context) throw new Error('useProjectUi must be used within ProjectUiProvider')
  return context
}
