"use client"

import * as React from "react"
import useSWR from "swr"
import { IconSearch } from "@tabler/icons-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { fetcher } from "@/lib/api"

interface InstalledGroup {
  id: number
  vk_group_id: number
  name: string
  screen_name: string
  photo_200: string
  is_active: boolean
  members_count: number
}

interface GroupsResponse {
  groups: InstalledGroup[]
}

export function GroupSelector() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedGroups, setSelectedGroups] = React.useState<number[]>([])

  const { data, error, isLoading } = useSWR<GroupsResponse>("/admin/groups/installed", fetcher)
  
  const groups = data?.groups || []

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleAll = () => {
    if (selectedGroups.length === filteredGroups.length) {
      setSelectedGroups([])
    } else {
      setSelectedGroups(filteredGroups.map((g) => g.id))
    }
  }

  const toggleGroup = (id: number) => {
    if (selectedGroups.includes(id)) {
      setSelectedGroups(selectedGroups.filter((groupId) => groupId !== id))
    } else {
      setSelectedGroups([...selectedGroups, id])
    }
  }

  return (
    <Card className="h-full flex flex-col max-h-[600px] lg:max-h-full shadow-md border-muted-foreground/15 overflow-hidden bg-card">
      <CardHeader className="pb-4 border-b bg-muted/30 px-6 py-4">
        <CardTitle className="text-lg flex items-center justify-between font-semibold">
          <span>Целевые группы</span>
          <span className="text-xs font-medium text-muted-foreground bg-background px-2.5 py-1 rounded-full border shadow-sm">
            {selectedGroups.length} / {groups.length}
          </span>
        </CardTitle>
        <div className="relative mt-3">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Поиск сообщества..."
            className="pl-9 bg-background/50 border-muted-foreground/20 focus-visible:bg-background shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/10">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="select-all" 
            checked={filteredGroups.length > 0 && selectedGroups.length === filteredGroups.length}
            onCheckedChange={toggleAll}
            disabled={filteredGroups.length === 0}
          />
          <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
            Выбрать все
          </Label>
        </div>
      </div>

      <CardContent className="flex-1 p-0 overflow-y-auto">
        <div className="flex flex-col">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 px-6 border-b border-border/50">
                <Skeleton className="size-4 rounded-sm" />
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            <div className="p-8 text-center text-destructive text-sm bg-destructive/5 m-4 rounded-lg border border-destructive/20">
              Ошибка загрузки сообществ
            </div>
          ) : filteredGroups.map((group) => {
            const isSelected = selectedGroups.includes(group.id);
            return (
              <div
                key={group.id}
                className={`flex items-center space-x-4 p-4 px-6 border-b border-border/50 last:border-0 transition-colors cursor-pointer ${
                  isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                }`}
                onClick={() => toggleGroup(group.id)}
              >
                <Checkbox 
                  id={`group-${group.id}`} 
                  checked={selectedGroups.includes(group.id)}
                  onCheckedChange={() => toggleGroup(group.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    src={group.photo_200 || "https://vk.com/images/community_200.png"}
                    alt={group.name}
                    className="size-8 rounded-full object-cover bg-muted shrink-0"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium leading-none truncate mb-1">
                      {group.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {group.members_count.toLocaleString("ru-RU")} подписчиков
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {!isLoading && !error && filteredGroups.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Сообщества не найдены
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
