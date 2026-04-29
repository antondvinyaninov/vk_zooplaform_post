import type { ReactNode } from "react"
import useSWR from "swr"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import {
  IconActivity,
  IconAlertTriangle,
  IconCalendarStats,
  IconCircleCheck,
  IconRefresh,
  IconShieldCheck,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { fetcher } from "@/lib/api"

interface DashboardStatsResponse {
  total_groups: number
  total_subscribers: number
  groups_ok: number
  groups_error: number
  groups_unknown: number
  posts_total: number
  posts_pending: number
  posts_published: number
  posts_rejected: number
  posts_scheduled: number
  posts_failed: number
  posts_today: number
  last_group_check_at?: string
}

const numberFormatter = new Intl.NumberFormat("ru-RU")

function formatNumber(value?: number) {
  return numberFormatter.format(value ?? 0)
}

function MetricValue({
  loading,
  children,
  skeletonClassName = "h-8 w-20",
}: {
  loading: boolean
  children: ReactNode
  skeletonClassName?: string
}) {
  if (loading) {
    return <Skeleton className={`${skeletonClassName} mt-2 mb-1`} />
  }

  return (
    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
      {children}
    </CardTitle>
  )
}

function LastCheckLabel({ value }: { value?: string }) {
  if (!value) return <>Проверок еще не было</>

  return (
    <>
      Последняя проверка{" "}
      {formatDistanceToNow(new Date(value), { addSuffix: true, locale: ru })}
    </>
  )
}

export function SectionCards() {
  const {
    data: statsData,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DashboardStatsResponse>("/admin/dashboard/stats", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  const totalGroups = statsData?.total_groups ?? 0
  const groupsOK = statsData?.groups_ok ?? 0
  const groupsError = statsData?.groups_error ?? 0
  const groupsUnknown = statsData?.groups_unknown ?? 0
  const hasGroups = totalGroups > 0
  const hasGroupIssues = groupsError > 0
  const hasUnknownGroups = groupsUnknown > 0
  const isHealthy = hasGroups && !hasGroupIssues && !hasUnknownGroups
  const postMetrics: Array<{ label: string; value?: number; className: string }> = [
    { label: "Всего", value: statsData?.posts_total, className: "border-muted text-foreground" },
    { label: "Ждут", value: statsData?.posts_pending, className: "border-amber-500/50 text-amber-600 dark:text-amber-400" },
    { label: "План", value: statsData?.posts_scheduled, className: "border-sky-500/50 text-sky-600 dark:text-sky-400" },
    { label: "Опубл.", value: statsData?.posts_published, className: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" },
    { label: "Отклон.", value: statsData?.posts_rejected, className: "border-muted text-muted-foreground" },
    { label: "Сбой", value: statsData?.posts_failed, className: "border-destructive/50 text-destructive" },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUsersGroup className="size-4 text-primary" />
            Активные группы
          </CardDescription>
          <CardAction>
            {error ? (
              <Badge variant="destructive">Ошибка</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Live
              </Badge>
            )}
          </CardAction>
          <MetricValue loading={isLoading}>
            {formatNumber(totalGroups)}
          </MetricValue>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <div className="text-muted-foreground">
              {groupsOK} работают, {groupsError} требуют внимания
            </div>
          )}
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUsers className="size-4 text-primary" />
            Общая аудитория
          </CardDescription>
          <CardAction>
            <Badge variant="outline" className="text-muted-foreground">
              База
            </Badge>
          </CardAction>
          <MetricValue loading={isLoading} skeletonClassName="h-8 w-28">
            {formatNumber(statsData?.total_subscribers)}
          </MetricValue>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {isLoading ? (
            <Skeleton className="h-4 w-36" />
          ) : (
            <div className="text-muted-foreground">
              {formatNumber(statsData?.posts_today)} новых постов сегодня
            </div>
          )}
        </CardFooter>
      </Card>

      <Card className="@container/card flex flex-col">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-2">
            <IconActivity className="size-4 text-primary" />
            Предложка за 7 дней
          </CardDescription>
          <CardAction>
            <Badge variant="outline" className="text-muted-foreground">
              7 дней
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid flex-1 grid-cols-3 gap-3 pb-4 text-sm">
          {postMetrics.map(({ label, value, className }) => (
            <div key={label} className={`flex flex-col gap-1 border-l-2 pl-3 ${className}`}>
              <span className="text-xs text-muted-foreground">{label}</span>
              {isLoading ? (
                <Skeleton className="mt-1 h-5 w-8" />
              ) : (
                <span className="text-lg font-semibold leading-none tabular-nums">
                  {value ?? 0}
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconShieldCheck className="size-4 text-primary" />
            Пульс системы
          </CardDescription>
          <CardAction>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={isValidating}
              title="Обновить показатели"
              onClick={() => void mutate()}
            >
              <IconRefresh className={isValidating ? "animate-spin" : ""} />
              <span className="sr-only">Обновить показатели</span>
            </Button>
          </CardAction>
          <MetricValue loading={isLoading} skeletonClassName="h-8 w-28">
            {error ? (
              <span className="text-destructive">Ошибка</span>
            ) : !hasGroups ? (
              "Нет групп"
            ) : isHealthy ? (
              "OK"
            ) : (
              "Внимание"
            )}
          </MetricValue>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {isLoading ? (
            <Skeleton className="h-4 w-44" />
          ) : error ? (
            <>
              <div className="line-clamp-1 flex items-center gap-2 font-medium text-destructive">
                <IconAlertTriangle className="size-4" />
                Данные не загрузились
              </div>
              <div className="text-muted-foreground">
                Проверьте API дашборда
              </div>
            </>
          ) : isHealthy ? (
            <>
              <div className="line-clamp-1 flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                <IconCircleCheck className="size-4" />
                Подключения в норме
              </div>
              <div className="text-muted-foreground">
                <LastCheckLabel value={statsData?.last_group_check_at} />
              </div>
            </>
          ) : !hasGroups ? (
            <>
              <div className="line-clamp-1 flex items-center gap-2 font-medium text-muted-foreground">
                <IconCalendarStats className="size-4" />
                Нет активной базы
              </div>
              <div className="text-muted-foreground">Подключенные группы появятся в сводке</div>
            </>
          ) : (
            <>
              <div className="line-clamp-1 flex items-center gap-2 font-medium text-destructive">
                <IconAlertTriangle className="size-4" />
                Требуется внимание
              </div>
              <div className="text-muted-foreground">
                {groupsError} с ошибкой, {groupsUnknown} без проверки
              </div>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
