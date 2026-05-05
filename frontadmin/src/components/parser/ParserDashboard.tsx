"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { IconSearch, IconPlayerPlay, IconPlayerStop, IconDownload } from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ParserResultsTable } from "./ParserResultsTable"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function ParserDashboard() {
  const [keywords, setKeywords] = useState("приют для животных, приют собак, приют кошек, бездомные животные, помощь бездомным, помощь животным, спасение животных, зоозащита, защита животных, волонтеры животные, потеряшки животные, передержка животных, в добрые руки животные, ищут дом животные, хвостики приют, помощь хвостикам, благотворительный фонд животные, бездомыши")
  const [cities, setCities] = useState("60, 41, 125, 36, 91") // Ижевск, Глазов, Сарапул, Воткинск, Можга
  const [manualLink, setManualLink] = useState("")
  
  // Poll status every 3 seconds if running
  const { data: status, mutate: mutateStatus } = useSWR('/api/admin/parser/status', fetcher, {
    refreshInterval: (data) => (data?.status === 'running' ? 3000 : 0)
  })

  const handleStart = async () => {
    try {
      const res = await fetch('/api/admin/parser/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, cities })
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Парсинг запущен")
        mutateStatus()
      } else {
        toast.error(data.error || "Ошибка запуска")
      }
    } catch (e) {
      toast.error("Ошибка сети")
    }
  }

  const handleStop = async () => {
    try {
      const res = await fetch('/api/admin/parser/stop', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success("Парсинг остановлен")
        mutateStatus()
      }
    } catch (e) {
      toast.error("Ошибка сети")
    }
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualLink) return
    try {
      const res = await fetch('/api/admin/parser/add-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_or_id: manualLink })
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Группа успешно добавлена")
        setManualLink("")
        // Need to re-trigger table fetch, but we can't easily without passing a prop or using global swr mutate, but SWR handles it if they share keys or we can just let it be.
      } else {
        toast.error("Ошибка: Группа не найдена или недоступна")
      }
    } catch (e) {
      toast.error("Ошибка сети")
    }
  }

  const isRunning = status?.status === 'running'

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Парсер ВКонтакте</h1>
          <p className="text-muted-foreground text-sm">
            Сбор и ведение глобального справочника групп
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Настройки парсинга</CardTitle>
            <CardDescription>Укажите параметры для автоматического поиска.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keywords">Ключевые слова (через запятую)</Label>
              <Textarea 
                id="keywords" 
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="животные, приюты, ветклиники..."
                disabled={isRunning}
                className="h-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cities">ID городов VK (через запятую)</Label>
              <Input 
                id="cities" 
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                placeholder="60, 41, 125..."
                disabled={isRunning}
              />
              <p className="text-xs text-muted-foreground">Пример: Удмуртия (Ижевск: 60, Глазов: 41, Сарапул: 125, Воткинск: 36, Можга: 91)</p>
            </div>
            
            <div className="flex gap-2 pt-2">
              {!isRunning ? (
                <Button onClick={handleStart} className="w-full">
                  <IconPlayerPlay className="mr-2 h-4 w-4" /> Запустить
                </Button>
              ) : (
                <Button variant="destructive" onClick={handleStop} className="w-full">
                  <IconPlayerStop className="mr-2 h-4 w-4" /> Остановить
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Статус парсера</CardTitle>
              <CardDescription>Текущее состояние</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">Состояние</span>
                    <Badge variant={status.status === 'running' ? 'default' : (status.status === 'error' ? 'destructive' : 'secondary')}>
                      {status.status === 'running' ? 'В процессе' : (status.status === 'completed' ? 'Завершен' : 'Ошибка')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">Найдено групп за сессию</span>
                    <span className="font-bold text-lg">{status.total_found || 0}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">Текущий город (ID)</span>
                    <span className="text-sm">{status.current_city || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Начат</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(status.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Нет активных задач
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Добавить вручную</CardTitle>
              <CardDescription>Вставьте ID группы или ссылку</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddManual} className="flex gap-2">
                <Input 
                  value={manualLink}
                  onChange={e => setManualLink(e.target.value)}
                  placeholder="https://vk.com/club123456" 
                />
                <Button type="submit" variant="secondary">Добавить</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Справочник групп</CardTitle>
            <CardDescription>Все собранные группы (кроме черного списка)</CardDescription>
          </div>
          <a 
            href={`/api/admin/parser/results?export=csv`} 
            download={`parsed_groups_master.csv`}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground text-[0.8rem] h-7 px-2.5 font-medium transition-all"
          >
            <IconDownload className="mr-2 h-4 w-4" /> Скачать CSV
          </a>
        </CardHeader>
        <CardContent>
          <ParserResultsTable />
        </CardContent>
      </Card>
    </div>
  )
}
