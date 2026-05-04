import { AppUsersTable } from "@/components/app-users-table"

export function AppUsersPage() {
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

        {/* Users Table */}
        <div className="mt-4">
          <AppUsersTable />
        </div>
      </div>
    </div>
  )
}
