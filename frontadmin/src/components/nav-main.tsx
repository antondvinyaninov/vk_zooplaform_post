"use client"

import { IconChevronRight, IconCirclePlusFilled, IconMail } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { state } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">

        <SidebarMenu>
          {items.map((item) => {
            if (item.items && item.items.length > 0) {
              if (state === "collapsed") {
                return (
                  <SidebarMenuItem key={item.title}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <SidebarMenuButton
                            tooltip={item.title}
                            onClick={(e) => e.preventDefault()}
                            type="button"
                          />
                        }
                      >
                        {item.icon}
                        <span>{item.title}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={8}
                        className="w-48 rounded-lg"
                      >
                        <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {item.items.map((subItem) => (
                          <DropdownMenuItem
                            key={subItem.title}
                            render={<a href={subItem.url} />}
                          >
                            {subItem.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                )
              }

              return (
                <Collapsible
                  key={item.title}
                  defaultOpen={item.isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={<SidebarMenuButton tooltip={item.title} />}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                      <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton render={<a href={subItem.url} />}>
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  tooltip={item.title} 
                  isActive={item.isActive}
                  className={item.isActive ? "bg-primary! text-primary-foreground! hover:bg-primary/90! hover:text-primary-foreground!" : ""}
                  render={<a href={item.url} />}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
