"use client"

import * as React from "react"
import { IconDashboard, IconSettings, IconUsers, IconListDetails } from "@tabler/icons-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    const openEvent = () => setOpen(true)

    document.addEventListener("keydown", down)
    window.addEventListener("open-command-palette", openEvent)
    return () => {
      document.removeEventListener("keydown", down)
      window.removeEventListener("open-command-palette", openEvent)
    }
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Введите команду или поиск..." />
        <CommandList>
          <CommandEmpty>Ничего не найдено.</CommandEmpty>
          <CommandGroup heading="Навигация">
            <CommandItem
              onSelect={() => runCommand(() => window.location.assign("/dashboard"))}
            >
              <IconDashboard className="mr-2 h-4 w-4" />
              <span>Главная</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => window.location.assign("/groups"))}
            >
              <IconUsers className="mr-2 h-4 w-4" />
              <span>Группы</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => window.location.assign("/posts"))}
            >
              <IconListDetails className="mr-2 h-4 w-4" />
              <span>Посты</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => window.location.assign("/settings"))}
            >
              <IconSettings className="mr-2 h-4 w-4" />
              <span>Настройки</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
