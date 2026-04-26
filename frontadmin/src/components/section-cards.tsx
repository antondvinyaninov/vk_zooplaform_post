import * as React from "react"
import useSWR from "swr"
import { IconTrendingDown, IconTrendingUp, IconUsersGroup, IconUsers, IconActivity, IconShieldCheck, IconCircleCheck, IconAlertTriangle } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { fetcher, type GroupsResponse } from "@/lib/api"

interface DashboardStatsResponse {
  total_groups: number
  total_subscribers: number
  posts_total: number
  posts_pending: number
  posts_published: number
  posts_rejected: number
  history: any[]
}

export function SectionCards() {
  const { data: groupsData, error: groupsError, isLoading: isLoadingGroups } = useSWR<GroupsResponse>("/admin/groups/installed", fetcher)
  const { data: statsData, isLoading: isLoadingStats } = useSWR<DashboardStatsResponse>("/admin/dashboard/stats", fetcher)

  const groups = groupsData?.groups || []
  const groupsCount = groups.length
  const totalAudience = groups.reduce((sum, g) => sum + g.members_count, 0)
  
  // Checking health status
  const groupsWithError = groups.filter(g => g.health_status === "error").length
  const isHealthy = groupsWithError === 0 && groupsCount > 0

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      
      {/* Block 1: Groups */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUsersGroup className="size-4 text-primary" />
            Подключенные группы
          </CardDescription>
          {isLoadingGroups ? (
            <Skeleton className="h-8 w-16 mt-2 mb-1" />
          ) : (
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {groupsCount}
            </CardTitle>
          )}
          <CardAction>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Общее количество
          </div>
        </CardFooter>
      </Card>

      {/* Block 2: Total Audience */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUsers className="size-4 text-primary" />
            Общая аудитория
          </CardDescription>
          {isLoadingGroups ? (
            <Skeleton className="h-8 w-24 mt-2 mb-1" />
          ) : (
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {new Intl.NumberFormat("ru-RU").format(totalAudience)}
            </CardTitle>
          )}
          <CardAction>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Суммарный охват базы
          </div>
        </CardFooter>
      </Card>

      {/* Block 3: Moderation */}
      <Card className="@container/card flex flex-col">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-2">
            <IconActivity className="size-4 text-primary" />
            Предложка (за 7 дней)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 grid grid-cols-2 gap-y-3 gap-x-6 text-sm pb-4">
          <div className="flex flex-col gap-1 border-l-2 border-muted pl-3">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Предложено</span>
            {isLoadingStats ? <Skeleton className="h-6 w-10 mt-1" /> : <span className="font-semibold text-lg leading-none">{statsData?.posts_total || 0}</span>}
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-amber-500/50 pl-3">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">В обработке</span>
            {isLoadingStats ? <Skeleton className="h-6 w-10 mt-1" /> : <span className="font-semibold text-lg leading-none text-amber-600 dark:text-amber-400">{statsData?.posts_pending || 0}</span>}
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-emerald-500/50 pl-3">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Опубликовано</span>
            {isLoadingStats ? <Skeleton className="h-6 w-10 mt-1" /> : <span className="font-semibold text-lg leading-none text-emerald-600 dark:text-emerald-400">{statsData?.posts_published || 0}</span>}
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-destructive/50 pl-3">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Отклонено</span>
            {isLoadingStats ? <Skeleton className="h-6 w-10 mt-1" /> : <span className="font-semibold text-lg leading-none text-destructive">{statsData?.posts_rejected || 0}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Block 4: Health Check */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconShieldCheck className="size-4 text-primary" />
            Статус подключений
          </CardDescription>
          {isLoading ? (
            <Skeleton className="h-8 w-32 mt-2 mb-1" />
          ) : (
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl flex items-center gap-2">
              {groupsCount === 0 ? "N/A" : (isHealthy ? "100%" : "Ошибка")}
              {groupsCount > 0 && isHealthy && <span className="text-base font-normal text-muted-foreground">Online</span>}
            </CardTitle>
          )}
          
          <CardAction>
            {isLoading ? null : isHealthy || groupsCount === 0 ? (
              <Badge variant="outline" className="text-emerald-500 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                <IconCircleCheck className="mr-1 size-3" />
                API OK
              </Badge>
            ) : (
              <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                <IconAlertTriangle className="mr-1 size-3" />
                Сбой токена
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {isLoading ? (
             <Skeleton className="h-4 w-32" />
          ) : isHealthy || groupsCount === 0 ? (
            <>
              <div className="line-clamp-1 flex gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                Все токены действительны
              </div>
              <div className="text-muted-foreground">
                Ошибок доступа не найдено
              </div>
            </>
          ) : (
            <>
              <div className="line-clamp-1 flex gap-2 font-medium text-destructive">
                Требуется внимание
              </div>
              <div className="text-muted-foreground">
                {groupsWithError} {groupsWithError === 1 ? "группа потеряла доступ" : "групп потеряли доступ"}
              </div>
            </>
          )}
        </CardFooter>
      </Card>

    </div>
  )
}

