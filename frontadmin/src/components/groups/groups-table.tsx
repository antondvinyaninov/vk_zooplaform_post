import * as React from "react"
import useSWR from "swr"
import { IconDotsVertical, IconRefresh, IconSettings, IconTrash, IconAlertCircle } from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

import { fetcher, api, type GroupsResponse, type Group } from "@/lib/api"

function StatusBadge({ status }: { status: string }) {
  if (status === "ok") {
    return <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20">Работает</Badge>
  }
  if (status === "error") {
    return <Badge variant="destructive" className="bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20">Ошибка</Badge>
  }
  return <Badge variant="secondary">Не проверено</Badge>
}

export function GroupsTable() {
  const { data, error, isLoading, mutate } = useSWR<GroupsResponse>("/admin/groups/installed", fetcher)
  const [refreshingId, setRefreshingId] = React.useState<number | null>(null)

  const groups = data?.groups || []

  const handleRefreshHealth = async (groupId: number) => {
    try {
      setRefreshingId(groupId)
      await api.post("/admin/groups/health/refresh", { group_id: groupId })
      mutate() // Refresh the list
    } catch (err) {
      console.error("Failed to refresh health", err)
    } finally {
      setRefreshingId(null)
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Сообщество</TableHead>
            <TableHead>VK ID</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="hidden md:table-cell">Последняя проверка</TableHead>
            <TableHead className="hidden sm:table-cell text-right">Подписчики</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Loading Skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-3 w-[100px]" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="hidden sm:table-cell text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="size-8 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : error ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center">
                  <IconAlertCircle className="size-6 text-destructive mb-2" />
                  <p>Ошибка загрузки групп</p>
                </div>
              </TableCell>
            </TableRow>
          ) : groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                Группы не найдены
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img
                      src={group.photo_200}
                      alt={group.name}
                      className="size-10 rounded-full object-cover border bg-muted"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium line-clamp-1 max-w-[200px]" title={group.name}>{group.name}</span>
                      <span className="text-xs text-muted-foreground">@{group.screen_name || group.vk_group_id}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{group.vk_group_id}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <StatusBadge status={group.health_status} />
                    {group.health_error && (
                      <span className="text-[10px] text-destructive max-w-[150px] truncate" title={group.health_error}>
                        {group.health_error}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {group.last_check_at ? formatDistanceToNow(new Date(group.last_check_at), { addSuffix: true, locale: ru }) : "Никогда"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right font-medium tabular-nums">
                  {new Intl.NumberFormat("ru-RU").format(group.members_count)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon" className="size-8" disabled={refreshingId === group.id}>
                        <IconDotsVertical className="size-4" />
                        <span className="sr-only">Меню действий</span>
                      </Button>
                    } />
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                      </DropdownMenuGroup>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => handleRefreshHealth(group.id)}>
                        <IconRefresh className={`mr-2 size-4 text-muted-foreground ${refreshingId === group.id ? 'animate-spin' : ''}`} />
                        Проверить статус
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <IconSettings className="mr-2 size-4 text-muted-foreground" />
                        Настройки группы
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                        <IconTrash className="mr-2 size-4" />
                        Отключить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
