import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import useSWR from "swr"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { fetcher } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

export const description = "An interactive area chart"

const chartConfig = {
  subscribers: {
    label: "Подписчики",
    color: "var(--primary)",
  },
  groups: {
    label: "Группы",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

interface DailyStat {
  date: string
  total_groups: number
  total_subscribers: number
}

interface DashboardStatsResponse {
  total_groups: number
  total_subscribers: number
  history: DailyStat[]
}

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile && timeRange === "30d") {
      setTimeRange("7d")
    }
  }, [isMobile])

  const { data, isLoading } = useSWR<DashboardStatsResponse>("/admin/dashboard/stats", fetcher)

  const chartData = React.useMemo(() => {
    if (!data?.history) return [];
    return data.history.map(item => ({
      date: item.date,
      subscribers: item.total_subscribers,
      groups: item.total_groups,
    }));
  }, [data])

  const filteredData = React.useMemo(() => {
    let daysToSubtract = 30;
    if (timeRange === "7d") {
      daysToSubtract = 7;
    } else if (timeRange === "1d") {
      daysToSubtract = 1;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    return chartData.filter(item => new Date(item.date) >= startDate);
  }, [chartData, timeRange]);

  const formatDateTick = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
  }

  const formatTooltipLabel = (value: any) => {
    if (!value) return "";
    const date = new Date(value as string);
    return date.toLocaleDateString("ru-RU", { month: "long", day: "numeric", year: "numeric" });
  }

  return (
    <Card className="@container/card shadow-sm border-muted-foreground/15 overflow-hidden">
      <CardHeader className="bg-muted/10 border-b pb-4">
        <CardTitle>Динамика аудитории</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Рост количества групп и подписчиков
          </span>
          <span className="@[540px]/card:hidden">Аудитория и Группы</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            value={[timeRange]}
            onValueChange={(val) => {
              if (val.length > 0) setTimeRange(val[val.length - 1])
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="30d">Месяц</ToggleGroupItem>
            <ToggleGroupItem value="7d">Неделя</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={(v) => v && setTimeRange(v)}>
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Выберите период"
            >
              <SelectValue placeholder="Месяц" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="30d" className="rounded-lg">Месяц</SelectItem>
              <SelectItem value="7d" className="rounded-lg">Неделя</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="aspect-auto h-[280px] w-full flex items-center justify-center">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[280px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillSubscribers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-subscribers)" stopOpacity={1.0} />
                  <stop offset="95%" stopColor="var(--color-subscribers)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillGroups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-groups)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-groups)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                minTickGap={32}
                tickFormatter={formatDateTick}
                className="text-xs text-muted-foreground font-medium"
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={formatTooltipLabel}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="groups"
                type="monotone"
                fill="url(#fillGroups)"
                stroke="var(--color-groups)"
                strokeWidth={2}
                stackId="b"
              />
              <Area
                dataKey="subscribers"
                type="monotone"
                fill="url(#fillSubscribers)"
                stroke="var(--color-subscribers)"
                strokeWidth={2}
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
