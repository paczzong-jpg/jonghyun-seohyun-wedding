import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTask,
  deleteTask,
  deleteTasks,
  listTasks,
  updateTask,
  updateTasksPriority,
  updateTasksStatus,
  type TaskFilters,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/admin-tasks'
import {
  createUser,
  deleteUser,
  deleteUsers,
  listUsers,
  updateUser,
  updateUsersStatus,
  type UserFilters,
  type UserInput,
  type UserStatus,
} from '@/lib/admin-users'

export const adminTaskKeys = {
  all: ['admin', 'tasks'] as const,
  lists: () => [...adminTaskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...adminTaskKeys.lists(), filters] as const,
}

export function useTasksQuery(filters: TaskFilters) {
  return useQuery({
    queryKey: adminTaskKeys.list(filters),
    queryFn: () => listTasks(filters),
    placeholderData: keepPreviousData,
  })
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminTaskKeys.lists() }),
  })
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskInput }) => updateTask(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminTaskKeys.lists() }),
  })
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminTaskKeys.lists() }),
  })
}

export function useDeleteTasksMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => deleteTasks(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminTaskKeys.lists() }),
  })
}

export function useUpdateTasksStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: TaskStatus }) => updateTasksStatus(ids, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminTaskKeys.lists() }),
  })
}

export function useUpdateTasksPriorityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, priority }: { ids: string[]; priority: TaskPriority }) => updateTasksPriority(ids, priority),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminTaskKeys.lists() }),
  })
}

export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  lists: () => [...adminUserKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...adminUserKeys.lists(), filters] as const,
}

export function useUsersQuery(filters: UserFilters) {
  return useQuery({
    queryKey: adminUserKeys.list(filters),
    queryFn: () => listUsers(filters),
    placeholderData: keepPreviousData,
  })
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UserInput) => createUser(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() }),
  })
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserInput }) => updateUser(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() }),
  })
}

export function useUpdateUsersStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: UserStatus }) => updateUsersStatus(ids, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() }),
  })
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() }),
  })
}

export function useDeleteUsersMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => deleteUsers(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() }),
  })
}
