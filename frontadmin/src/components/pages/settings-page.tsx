import { VkConnectCard } from "@/components/vk-connect-card"
import { UsersManagementCard } from "@/components/users-management-card"

export function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0 max-w-5xl w-full mx-auto mt-6">
      <div className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight">Настройки проекта</h2>
        <p className="text-muted-foreground mt-1">Управление аккаунтами ВКонтакте и доступом команды.</p>
      </div>
      
      <VkConnectCard />
      <UsersManagementCard />
    </div>
  )
}
