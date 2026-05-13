import { IconHeartbeat, IconRefresh } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { GroupsTable } from "@/components/groups/groups-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import useSWR from "swr"
import { fetcher, type GroupsResponse } from "@/lib/api"

export function GroupsPage() {
  const { data } = useSWR<GroupsResponse>("/admin/groups/installed", fetcher)
  
  const totalPosts = data?.groups?.reduce((sum, group) => sum + (group.posts_count || 0), 0) || 0
  const totalSubscribers = data?.groups?.filter(g => !g.is_test && g.health_status === 'ok').reduce((sum, group) => sum + (group.members_count || 0), 0) || 0
  const connectedGroups = data?.groups?.filter(g => !g.is_test && g.health_status === 'ok').length || 0
  const newGroups = data?.groups?.filter(g => !g.is_test && g.health_status !== 'ok').length || 0

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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">Всего постов</p>
                <p className="text-3xl font-bold">{new Intl.NumberFormat("ru-RU").format(totalPosts)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">Всего подписчиков</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{new Intl.NumberFormat("ru-RU").format(totalSubscribers)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">Подключенные группы</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{connectedGroups}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">Требуют внимания</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{newGroups}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Groups Data Table */}
        <div className="mt-4">
          <Tabs defaultValue="connected" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="connected">Подключенные</TabsTrigger>
              <TabsTrigger value="attention">Новенькие</TabsTrigger>
              <TabsTrigger value="test">Тестовые группы</TabsTrigger>
            </TabsList>
            <TabsContent value="connected" className="m-0">
              <GroupsTable endpoint="/admin/groups/installed" filterFn={(g) => !g.is_test && g.health_status === 'ok'} />
            </TabsContent>
            <TabsContent value="attention" className="m-0">
              <GroupsTable endpoint="/admin/groups/installed" filterFn={(g) => !g.is_test && g.health_status === 'error'} />
            </TabsContent>
            <TabsContent value="test" className="m-0">
              <GroupsTable endpoint="/admin/groups/all" filterFn={(g) => !!g.is_test} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
