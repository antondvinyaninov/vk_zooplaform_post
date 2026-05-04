import { SystemLogs } from "@/components/system-logs"

export function LogsPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Системные логи</h1>
            <p className="text-muted-foreground">
              Журнал перехваченных падений (Panic Recovery) и системных событий.
            </p>
          </div>
        </div>

        {/* Logs Table */}
        <div className="mt-4">
          <SystemLogs />
        </div>
      </div>
    </div>
  )
}
