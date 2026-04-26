import { IconHeartbeat, IconRefresh } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { GroupsStatsChart } from "@/components/groups/groups-stats-chart"
import { GroupsTable } from "@/components/groups/groups-table"

export function GroupsPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Группы</h1>
            <p className="text-muted-foreground">
              Статистика и управление подключенными сообществами.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <IconRefresh className="mr-2 size-4" />
              Обновить список
            </Button>
            <Button size="sm">
              <IconHeartbeat className="mr-2 size-4" />
              Проверить все группы
            </Button>
          </div>
        </div>

        {/* Interactive Stats Chart */}
        <GroupsStatsChart />

        {/* Groups Data Table */}
        <div className="mt-4">
          <GroupsTable />
        </div>
      </div>
    </div>
  )
}
