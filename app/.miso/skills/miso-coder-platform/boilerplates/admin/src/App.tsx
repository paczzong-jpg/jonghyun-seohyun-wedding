import { QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/layout/app-shell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { UsersPage } from '@/features/users/UsersPage'
import { AppsPage } from '@/features/apps/AppsPage'
import { ChatsPage } from '@/features/chats/ChatsPage'
import { SignInPage } from '@/features/auth/SignInPage'
import { SignIn2Page } from '@/features/auth/SignIn2Page'
import { SignUpPage } from '@/features/auth/SignUpPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { OtpPage } from '@/features/auth/OtpPage'
import { ErrorPage } from '@/features/errors/ErrorPage'
import { HelpCenterPage } from '@/features/help/HelpCenterPage'
import { SettingsLayout } from '@/features/settings/SettingsLayout'
import { ProfileSettingsPage } from '@/features/settings/ProfileSettingsPage'
import { AccountSettingsPage } from '@/features/settings/AccountSettingsPage'
import { AppearanceSettingsPage } from '@/features/settings/AppearanceSettingsPage'
import { DisplaySettingsPage } from '@/features/settings/DisplaySettingsPage'
import { NotificationsSettingsPage } from '@/features/settings/NotificationsSettingsPage'
import { queryClient } from '@/lib/query-client'

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/records', element: <Navigate to='/tasks' replace /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/apps', element: <AppsPage /> },
      { path: '/chats', element: <ChatsPage /> },
      { path: '/help-center', element: <HelpCenterPage /> },
      {
        path: '/settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <ProfileSettingsPage /> },
          { path: 'account', element: <AccountSettingsPage /> },
          { path: 'appearance', element: <AppearanceSettingsPage /> },
          { path: 'display', element: <DisplaySettingsPage /> },
          { path: 'notifications', element: <NotificationsSettingsPage /> },
        ],
      },
    ],
  },
  { path: '/sign-in', element: <SignInPage /> },
  { path: '/sign-in-2', element: <SignIn2Page /> },
  { path: '/sign-up', element: <SignUpPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/otp', element: <OtpPage /> },
  { path: '/401', element: <ErrorPage code='401' title='Unauthorized' description='This preview route shows the unauthorized state for generated admin apps.' /> },
  { path: '/403', element: <ErrorPage code='403' title='Forbidden' description='The current account is authenticated but does not have this admin permission.' /> },
  { path: '/404', element: <ErrorPage code='404' title='Not Found' description='The requested admin route does not exist.' /> },
  { path: '/500', element: <ErrorPage code='500' title='Server Error' description='The runtime failed while processing this admin request.' /> },
  { path: '/503', element: <ErrorPage code='503' title='Maintenance' description='This area is temporarily disabled while the workspace is being updated.' /> },
  { path: '*', element: <Navigate to='/404' replace /> },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors closeButton />
    </QueryClientProvider>
  )
}
