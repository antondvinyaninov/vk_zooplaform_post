"use client"

import * as React from "react"
import useSWR from "swr"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { fetcher } from "@/lib/api"
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
import { Skeleton } from "@/components/ui/skeleton"

interface DailyStat {
  date: string
  total_groups: number
  total_subscribers: number
}

interface StatsResponse {
  history: DailyStat[]
}

const chartConfig = {
  total_subscribers: {
    label: "Подписчики",
    color: "var(--primary)",
  },
  total_groups: {
    label: "Группы",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

export function GroupsStatsChart() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const { data, isLoading } = useSWR<StatsResponse>("/admin/dashboard/stats", fetcher)
  
  const historyData = data?.history || []

  const filteredData = historyData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date() // Use current date for real data
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Динамика групп</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Суммарный прирост за выбранный период
          </span>
          <span className="@[540px]/card:hidden">Суммарный прирост</span>
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
            <ToggleGroupItem value="90d">За 3 месяца</ToggleGroupItem>
            <ToggleGroupItem value="30d">За 30 дней</ToggleGroupItem>
            <ToggleGroupItem value="7d">За 7 дней</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={(v) => v && setTimeRange(v)}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Выберите период"
            >
              <SelectValue placeholder="За 3 месяца" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                За 3 месяца
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                За 30 дней
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                За 7 дней
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
           <Skeleton className="h-[250px] w-full rounded-xl" />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillSubscribers" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-total_subscribers)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-total_subscribers)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillGroups" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-total_groups)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-total_groups)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              
              {/* Левая ось для подписчиков */}
              <YAxis 
                yAxisId="left"
                orientation="left"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toLocaleString("ru-RU")}
                className="text-xs text-muted-foreground"
              />
              
              {/* Правая ось для групп */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickCount={5}
                className="text-xs text-muted-foreground"
              />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("ru-RU", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("ru-RU", {
                        month: "short",
                        day: "numeric",
                      })
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                yAxisId="right"
                dataKey="total_groups"
                type="natural"
                fill="url(#fillGroups)"
                stroke="var(--color-total_groups)"
                strokeWidth={2}
              />
              <Area
                yAxisId="left"
                dataKey="total_subscribers"
                type="natural"
                fill="url(#fillSubscribers)"
                stroke="var(--color-total_subscribers)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
