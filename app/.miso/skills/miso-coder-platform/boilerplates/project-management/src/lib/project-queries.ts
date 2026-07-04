import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createIssue, getProjectManagementData, markInboxRead, updateIssueStatus, type IssueInput } from '@/lib/project-store'
import type { IssueStatus } from '@/lib/project-data'

export const projectManagementKeys = {
  root: ['project-management'] as const,
  data: () => [...projectManagementKeys.root, 'data'] as const,
}

export function useProjectManagementData() {
  return useQuery({
    queryKey: projectManagementKeys.data(),
    queryFn: getProjectManagementData,
  })
}

export function useCreateIssueMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: IssueInput) => createIssue(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectManagementKeys.data() }),
  })
}

export function useUpdateIssueStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: IssueStatus }) => updateIssueStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectManagementKeys.data() }),
  })
}

export function useMarkInboxReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markInboxRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectManagementKeys.data() }),
  })
}
