import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar'
import { sidebarData } from '@/lib/admin-data'
import { NavGroup } from '@/layout/nav-group'
import { NavUser } from '@/layout/nav-user'
import { TeamSwitcher } from '@/layout/team-switcher'
import { useAdminUi } from '@/context/admin-ui-provider'

export function AppSidebar() {
  const { sidebarCollapsible, sidebarVariant } = useAdminUi()
  return (
    <Sidebar collapsible={sidebarCollapsible} variant={sidebarVariant}>
      <SidebarHeader><TeamSwitcher /></SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((group) => <NavGroup key={group.title} {...group} />)}
      </SidebarContent>
      <SidebarFooter><NavUser /></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
