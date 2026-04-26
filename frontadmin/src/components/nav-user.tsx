"use client"

import * as React from "react"
import {
  IconCreditCard,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const [adminUser, setAdminUser] = React.useState<{display_name?: string, role?: string, avatar_url?: string} | null>(null)

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("admin_user")
      if (stored) {
        setAdminUser(JSON.parse(stored))
      }
    } catch (e) {}
  }, [])

  const displayName = adminUser?.display_name || user.name
  const displayEmail = adminUser?.role ? `Роль: ${adminUser.role}` : user.email
  const displayAvatar = adminUser?.avatar_url || user.avatar

  const handleLogout = () => {
    localStorage.removeItem("admin_user")
    window.location.replace("/")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted"
          />
        }
      >
        <Avatar className="size-8 rounded-full grayscale hover:grayscale-0 transition-all duration-200">
          <AvatarImage src={displayAvatar} alt={displayName} />
          <AvatarFallback className="rounded-full bg-primary/10 text-primary font-medium">AD</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-lg"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
            <Avatar className="size-9 rounded-full">
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback className="rounded-full bg-primary/10 text-primary font-medium">AD</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {displayEmail}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <IconUserCircle className="mr-2 size-4 text-muted-foreground" />
            Профиль
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconNotification className="mr-2 size-4 text-muted-foreground" />
            Уведомления
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
          onClick={handleLogout}
        >
          <IconLogout className="mr-2 size-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
