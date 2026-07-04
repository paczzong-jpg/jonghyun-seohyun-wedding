import type { LucideIcon } from 'lucide-react'
import {
  AppWindow,
  Bell,
  Bot,
  Bug,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Command,
  FileX,
  GalleryVerticalEnd,
  LayoutDashboard,
  Lock,
  MessageSquareText,
  MonitorCog,
  Palette,
  ServerOff,
  Settings,
  ShieldCheck,
  UserCog,
  UserX,
  Users,
  Wrench,
} from 'lucide-react'

export type SidebarUser = {
  name: string
  email: string
  avatar: string
}

export type SidebarTeam = {
  name: string
  logo: LucideIcon
  plan: string
}

export type NavLink = {
  title: string
  url: string
  icon?: LucideIcon
  badge?: string
}

export type NavCollapsible = {
  title: string
  icon?: LucideIcon
  badge?: string
  items: NavLink[]
}

export type NavItem = NavLink | NavCollapsible

export type NavGroup = {
  title: string
  items: NavItem[]
}

export const sidebarData = {
  user: {
    name: 'Young',
    email: 'young@miso.local',
    avatar: '',
  } satisfies SidebarUser,
  teams: [
    { name: 'MISO Admin', logo: Command, plan: 'Coder + Shadcn' },
    { name: 'Operations', logo: GalleryVerticalEnd, plan: 'Workspace' },
    { name: 'Agent Runtime', logo: Bot, plan: 'PocketBase' },
  ] satisfies SidebarTeam[],
  navGroups: [
    {
      title: 'General',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Tasks', url: '/tasks', icon: ClipboardList, badge: 'PB' },
        { title: 'Apps', url: '/apps', icon: AppWindow },
        { title: 'Chats', url: '/chats', icon: MessageSquareText, badge: '3' },
        { title: 'Users', url: '/users', icon: Users },
        {
          title: 'Secured by MISO',
          icon: ShieldCheck,
          items: [
            { title: 'Sign In', url: '/sign-in' },
            { title: 'Sign Up', url: '/sign-up' },
            { title: 'User Management', url: '/users' },
          ],
        },
      ],
    },
    {
      title: 'Pages',
      items: [
        {
          title: 'Auth',
          icon: ShieldCheck,
          items: [
            { title: 'Sign In', url: '/sign-in' },
            { title: 'Sign In 2 Col', url: '/sign-in-2' },
            { title: 'Sign Up', url: '/sign-up' },
            { title: 'Forgot Password', url: '/forgot-password' },
            { title: 'OTP', url: '/otp' },
          ],
        },
        {
          title: 'Errors',
          icon: Bug,
          items: [
            { title: 'Unauthorized', url: '/401', icon: Lock },
            { title: 'Forbidden', url: '/403', icon: UserX },
            { title: 'Not Found', url: '/404', icon: FileX },
            { title: 'Server Error', url: '/500', icon: ServerOff },
            { title: 'Maintenance', url: '/503', icon: Wrench },
          ],
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            { title: 'Profile', url: '/settings', icon: UserCog },
            { title: 'Account', url: '/settings/account', icon: ShieldCheck },
            { title: 'Appearance', url: '/settings/appearance', icon: Palette },
            { title: 'Display', url: '/settings/display', icon: MonitorCog },
            { title: 'Notifications', url: '/settings/notifications', icon: Bell },
          ],
        },
        { title: 'Help Center', url: '/help-center', icon: CircleHelp },
      ],
    },
  ] satisfies NavGroup[],
}

export type TeamMember = {
  id: string
  name: string
  email: string
  role: string
  permission: 'Owner' | 'Admin' | 'Editor' | 'Viewer'
  status: 'active' | 'invited' | 'disabled'
  initials: string
}

export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'ally', name: 'Ally', email: 'ally@miso.local', role: 'Operations', permission: 'Admin', status: 'active', initials: 'AL' },
  { id: 'young', name: 'Young', email: 'young@miso.local', role: '기획자 · MISO PO', permission: 'Owner', status: 'active', initials: 'YO' },
  { id: 'eugene', name: 'Eugene', email: 'eugene@miso.local', role: 'FE 개발', permission: 'Admin', status: 'active', initials: 'EU' },
  { id: 'kade', name: 'Kade', email: 'kade@miso.local', role: 'BE 개발', permission: 'Editor', status: 'active', initials: 'KA' },
  { id: 'han', name: 'Han', email: 'han@miso.local', role: 'SRE', permission: 'Admin', status: 'invited', initials: 'HA' },
  { id: 'heather', name: 'Heather', email: 'heather@miso.local', role: 'UI/UX', permission: 'Editor', status: 'active', initials: 'HE' },
]

export const ADMIN_APPS = [
  { id: 'ops', name: 'Operations Desk', type: 'Workflow', status: 'Live', owner: 'Young', description: 'Queue triage, QA handoff, and deployment checklist.' },
  { id: 'crm', name: 'Customer CRM', type: 'PocketBase', status: 'Draft', owner: 'Kade', description: 'Accounts, contacts, deals, and renewal follow-up.' },
  { id: 'chat', name: 'Support Chat', type: 'Agent', status: 'Live', owner: 'Ally', description: 'Conversation isolation, model selection, and tool calling.' },
  { id: 'event', name: 'Live Event Console', type: 'Realtime', status: 'Live', owner: 'Heather', description: 'Q&A, quiz, and prize draw presenter controls.' },
  { id: 'survey', name: 'Feedback Survey', type: 'Storage', status: 'Review', owner: 'Eugene', description: 'Response collection and dashboard exports.' },
  { id: 'finance', name: 'Finance Sync', type: 'Integration', status: 'Paused', owner: 'Han', description: 'Warehouse sync and provider API health checks.' },
]

export const CHAT_THREADS = [
  { id: 'c1', title: 'Launch checklist', author: 'Young', lastMessage: 'Can we verify the publish preview before noon?', unread: 3, model: 'Agent', time: '09:42' },
  { id: 'c2', title: 'CRM import issue', author: 'Kade', lastMessage: 'The spreadsheet parser needs CP949 fallback.', unread: 0, model: 'Tool', time: '10:15' },
  { id: 'c3', title: 'Design QA', author: 'Heather', lastMessage: 'Sidebar density now matches shadcn-admin.', unread: 1, model: 'Chatflow', time: '11:08' },
]

export const ACTIVITY_ITEMS = [
  { id: 'a1', title: 'Runtime schema synced', description: 'admin_tasks collection patched with full fields', icon: CheckCircle2 },
  { id: 'a2', title: 'Agent workflow connected', description: 'MISO direct tool surface is ready for admin actions', icon: Bot },
  { id: 'a3', title: 'App catalog reviewed', description: '12 generated apps scanned for stale publishing status', icon: GalleryVerticalEnd },
]
