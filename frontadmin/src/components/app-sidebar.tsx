import * as React from "react"
import { useEffect, useState } from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"


import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Главная",
      url: "/dashboard",
      icon: <IconDashboard />,
      isActive: false,
    },
    {
      title: "Группы",
      url: "/groups",
      icon: <IconUsers />,
    },
    {
      title: "Посты",
      url: "/posts",
      icon: <IconListDetails />,
    },
  ],
  navSecondary: [
    {
      title: "Настройки",
      url: "/settings",
      icon: <IconSettings />,
    },
    {
      title: "Помощь",
      url: "#",
      icon: <IconHelp />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [pathname, setPathname] = useState("")

  useEffect(() => {
    setPathname(window.location.pathname)
  }, [])

  // Remove trailing slashes for consistent matching
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  const currentPath = normalizedPath === "/" || normalizedPath === "" ? "/dashboard" : normalizedPath;

  const navMainWithActive = data.navMain.map(item => ({
    ...item,
    isActive: currentPath === item.url || (currentPath.startsWith(item.url) && item.url !== "/"),
  }))

  const navSecondaryWithActive = data.navSecondary.map(item => ({
    ...item,
    isActive: currentPath === item.url || (currentPath.startsWith(item.url) && item.url !== "/"),
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<a href="#" />}
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <img src="/logo-light.svg" alt="VkPet" className="size-6 dark:hidden" />
              <img src="/logo-dark.svg" alt="VkPet" className="hidden size-6 dark:block" />
              <span className="text-base font-semibold ml-1 tracking-tight">ЗооПлатформаVK</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainWithActive} />
        <NavSecondary items={navSecondaryWithActive} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}
