"use client"

import * as React from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { NavUser } from "@/components/nav-user"
import { IconSearch, IconBell } from "@tabler/icons-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { fetcher } from "@/lib/api"

export function SiteHeader({ title = "Dashboard" }: { title?: string }) {
  const { data } = useSWR("/admin/vk/connection", fetcher)
  
  const activeAccount = data?.active_account
  
  const user = {
    name: activeAccount?.user_name || "Администратор",
    email: activeAccount?.vk_user_id ? `VK ID: ${activeAccount.vk_user_id}` : "Не подключено",
    avatar: activeAccount?.user_photo || "",
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />

        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden w-full sm:block sm:w-48 md:w-56">
            <InputGroup 
              className="cursor-pointer bg-muted hover:bg-muted/80 transition-colors border-none shadow-none"
              onClick={(e) => {
                e.preventDefault()
                window.dispatchEvent(new Event("open-command-palette"))
              }}
            >
              <InputGroupAddon>
                <IconSearch className="size-4 opacity-50" />
              </InputGroupAddon>
              <InputGroupInput 
                placeholder="Поиск..." 
                readOnly
                className="cursor-pointer outline-none focus-visible:ring-0"
              />
              <InputGroupAddon align="inline-end" className="gap-0.5">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </InputGroupAddon>
            </InputGroup>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="sm:hidden text-muted-foreground hover:text-foreground"
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
          >
            <IconSearch className="size-4" />
            <span className="sr-only">Поиск</span>
          </Button>
          <Button variant="ghost" size="icon" className="relative size-8 text-muted-foreground hover:text-foreground">
            <IconBell className="size-4" />
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive"></span>
            <span className="sr-only">Уведомления</span>
          </Button>
          <ThemeToggle />
          <NavUser user={user} />
        </div>
      </div>
    </header>
  )
}
