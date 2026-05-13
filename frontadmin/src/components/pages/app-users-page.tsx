import { AppUsersTable } from "@/components/app-users-table"
import { Card, CardContent } from "@/components/ui/card"
import useSWR from "swr"
import { fetcher } from "@/lib/api"

interface AppUsersResponse {
  users: any[];
  total: number;
}

export function AppUsersPage() {
  const { data } = useSWR<AppUsersResponse>("/admin/app-users?limit=1&offset=0", fetcher)
  
  const totalUsers = data?.total || 0

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Пользователи Приложения</h1>
            <p className="text-muted-foreground">
              Список всех пользователей и подписчиков, которые открывали ваше VK Mini App.
            </p>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">Всего пользователей</p>
                <p className="text-3xl font-bold">{new Intl.NumberFormat("ru-RU").format(totalUsers)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <div className="mt-4">
          <AppUsersTable />
        </div>
      </div>
    </div>
  )
}
