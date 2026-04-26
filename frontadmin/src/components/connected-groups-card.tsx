import useSWR from "swr"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { IconPlus, IconAlertCircle } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { fetcher, type GroupsResponse } from "@/lib/api"

export function ConnectedGroupsCard() {
  const { data, error, isLoading } = useSWR<GroupsResponse>("/admin/groups/installed", fetcher)

  const groups = data?.groups || []

  return (
    <Card className="flex flex-col h-full shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle>Подключенные группы</CardTitle>
          <CardDescription className="mt-1">Управляйте вашими сообществами.</CardDescription>
        </div>
        <Button variant="outline" size="icon" className="shrink-0">
          <IconPlus className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <IconAlertCircle className="size-8 text-destructive mb-2 opacity-80" />
            <p>Не удалось загрузить группы.</p>
            <p className="text-xs mt-1">Проверьте подключение к API.</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p>Нет подключенных групп.</p>
            <Button variant="link" className="mt-2">Подключить группу</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.slice(0, 5).map((group) => (
              <div key={group.id} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="size-10">
                    <AvatarImage src={group.photo_200} alt={group.name} />
                    <AvatarFallback>{group.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none line-clamp-1">{group.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Intl.NumberFormat("ru-RU").format(group.members_count)} участников
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="text-xs">
                  Настройки
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
