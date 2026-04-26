import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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

export const description = "An interactive area chart"

const chartConfig = {
  subscribers: {
    label: "Подписчики",
    color: "var(--primary)",
  },
  reach: {
    label: "Охват",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

// Генерация случайных реалистичных данных
const generateDailyData = () => {
  const data = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let baseSubscribers = 200;
  let baseReach = 500;

  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    
    baseSubscribers += Math.floor(Math.random() * 40) - 10;
    baseReach = baseSubscribers * 2 + Math.floor(Math.random() * 200);

    data.push({
      date: d.toISOString(),
      subscribers: Math.max(0, baseSubscribers),
      reach: Math.max(0, baseReach),
    });
  }
  return data;
}

const generateHourlyData = () => {
  const data = [];
  const today = new Date();
  today.setMinutes(0, 0, 0);
  
  for (let i = 23; i >= 0; i--) {
    const d = new Date(today);
    d.setHours(d.getHours() - i);
    data.push({
      date: d.toISOString(),
      subscribers: Math.floor(Math.random() * 15) + 5,
      reach: Math.floor(Math.random() * 100) + 20,
    });
  }
  return data;
}

const dailyData = generateDailyData();
const hourlyData = generateHourlyData();

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile && timeRange === "30d") {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = React.useMemo(() => {
    if (timeRange === "1d") {
      return hourlyData;
    }
    
    let daysToSubtract = 30;
    if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    return dailyData.filter(item => new Date(item.date) >= startDate);
  }, [timeRange]);

  const formatDateTick = (value: string) => {
    const date = new Date(value);
    if (timeRange === "1d") {
      return date.toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
  }

  const formatTooltipLabel = (value: any) => {
    if (!value) return "";
    const date = new Date(value as string);
    if (timeRange === "1d") {
      return date.toLocaleString("ru-RU", { month: "short", day: "numeric", hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString("ru-RU", { month: "long", day: "numeric", year: "numeric" });
  }

  return (
    <Card className="@container/card shadow-sm border-muted-foreground/15 overflow-hidden">
      <CardHeader className="bg-muted/10 border-b pb-4">
        <CardTitle>Динамика аудитории</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Прирост подписчиков и охват
          </span>
          <span className="@[540px]/card:hidden">Прирост и охват</span>
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
            <ToggleGroupItem value="1d">День</ToggleGroupItem>
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
              <SelectItem value="1d" className="rounded-lg">День</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
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
              <linearGradient id="fillReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-reach)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-reach)" stopOpacity={0.1} />
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
              dataKey="reach"
              type="monotone"
              fill="url(#fillReach)"
              stroke="var(--color-reach)"
              strokeWidth={2}
              stackId="a"
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
      </CardContent>
    </Card>
  )
}
